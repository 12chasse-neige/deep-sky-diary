package deepsky.db

import cats.effect.IO
import cats.syntax.all.*
import doobie.*
import doobie.implicits.*
import doobie.postgres.implicits.*
import java.time.Instant
import java.util.UUID
import deepsky.domain.*

final class Repository(xa: Transactor[IO]) {
  def healthy: IO[Boolean] = sql"SELECT 1".query[Int].unique.transact(xa).as(true)

  def findCredentials(username: String): IO[Option[(UUID, String, String)]] =
    sql"SELECT id, username, password_hash FROM users WHERE username = $username"
      .query[(UUID, String, String)]
      .option
      .transact(xa)

  // Registration and its first session commit together; uniqueness is enforced by PostgreSQL.
  def register(user: User, passwordHash: String, tokenHash: String, expires: Instant): IO[User] =
    (for {
      _ <-
        sql"INSERT INTO users(id, username, password_hash) VALUES (${user.id}, ${user.username}, $passwordHash)".update.run
      _ <-
        sql"INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($tokenHash, ${user.id}, $expires)".update.run
    } yield user).transact(xa)

  def createSession(
      user: User,
      tokenHash: String,
      expires: Instant,
      previous: Option[String]
  ): IO[Unit] =
    (for {
      _ <- sql"DELETE FROM sessions WHERE expires_at <= now()".update.run
      _ <- previous.traverse_(hash => sql"DELETE FROM sessions WHERE token_hash = $hash".update.run)
      _ <-
        sql"INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($tokenHash, ${user.id}, $expires)".update.run
    } yield ()).transact(xa)

  def session(hash: String): IO[Option[User]] =
    sql"""SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = $hash AND s.expires_at > now()""".query[User].option.transact(xa)

  def revoke(hash: String): IO[Unit] =
    sql"DELETE FROM sessions WHERE token_hash = $hash".update.run.transact(xa).void

  // Owner predicates are mandatory, including deletes: a guessed UUID grants no access.
  def list(owner: UUID): IO[List[Observation]] =
    sql"""SELECT id, object, kind, date, location, equipment, sky, text, created_at,
           telescope, camera, latitude, longitude, seeing, cloud_cover, humidity
           FROM observations WHERE owner_id = $owner ORDER BY created_at DESC, id DESC"""
      .query[Observation]
      .to[List]
      .transact(xa)

  def create(owner: UUID, draft: ObservationDraft): IO[Observation] = {
    val id = UUID.randomUUID()
    sql"""INSERT INTO observations(id, owner_id, object, kind, date, location, equipment, sky, text,
           telescope, camera, latitude, longitude, seeing, cloud_cover, humidity)
           VALUES ($id, $owner, ${draft.`object`}, ${draft.kind}, ${draft.date}, ${draft.location},
                   ${draft.equipment}, ${draft.sky}, ${draft.text}, ${draft.telescope}, ${draft.camera},
                   ${draft.latitude}, ${draft.longitude}, ${draft.seeing}, ${draft.cloudCover}, ${draft.humidity})
           RETURNING id, object, kind, date, location, equipment, sky, text, created_at,
           telescope, camera, latitude, longitude, seeing, cloud_cover, humidity"""
      .query[Observation]
      .unique
      .transact(xa)
  }

  def delete(owner: UUID, id: UUID): IO[Boolean] =
    sql"DELETE FROM observations WHERE owner_id = $owner AND id = $id".update.run
      .transact(xa)
      .map(_ == 1)
}
