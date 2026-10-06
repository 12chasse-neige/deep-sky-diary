package deepsky.services

import cats.effect.IO
import cats.syntax.all.*
import deepsky.db.Repository
import deepsky.domain.*
import java.time.Instant
import java.util.UUID

final class AuthService(repo: Repository, dummyHash: String) {
  def register(value: Credentials): IO[(User, String)] = for {
    valid <- IO.fromEither(Validation.credentials(value))
    hash <- Security.hashPassword(valid.password)
    token <- Security.token
    user = User(UUID.randomUUID(), valid.username)
    result <- repo
      .register(user, hash, Security.digest(token), Instant.now().plusSeconds(604800))
      .handleErrorWith {
        case error: java.sql.SQLException if error.getSQLState == "23505" =>
          IO.raiseError(ApiError(409, "username_taken", "该用户名已被使用。"))
        case error => IO.raiseError(error)
      }
  } yield (result, token)

  def login(value: Credentials, previous: Option[String]): IO[(User, String)] = for {
    valid <- IO.fromEither(Validation.credentials(value))
    stored <- repo.findCredentials(valid.username)
    // Unknown accounts still perform Argon2 verification to reduce timing leakage.
    verified <- Security.verify(valid.password, stored.map(_._3).getOrElse(dummyHash))
    user <- stored
      .filter(_ => verified)
      .map { case (id, username, _) => User(id, username) }
      .liftTo[IO](ApiError(401, "invalid_credentials", "用户名或密码不正确。"))
    token <- Security.token
    _ <- repo.createSession(
      user,
      Security.digest(token),
      Instant.now().plusSeconds(604800),
      previous
    )
  } yield (user, token)
}
