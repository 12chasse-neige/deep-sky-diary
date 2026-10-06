package deepsky.services

import cats.effect.{IO, Ref}
import com.password4j.{Argon2Function, Password}
import com.password4j.types.Argon2
import java.security.{MessageDigest, SecureRandom}
import java.util.Base64

object Security {
  private val random = new SecureRandom()
  // OWASP minimum Argon2id profile: 19 MiB memory, two passes, one lane.
  private val argon = Argon2Function.getInstance(19456, 2, 1, 32, Argon2.ID)
  def hashPassword(password: String): IO[String] = IO.blocking {
    Password.hash(password).addRandomSalt(16).`with`(argon).getResult
  }
  def verify(password: String, hash: String): IO[Boolean] = IO.blocking {
    Password.check(password, hash).`with`(Argon2Function.getInstanceFromHash(hash))
  }
  def token: IO[String] = IO {
    val bytes = new Array[Byte](32)
    random.nextBytes(bytes)
    Base64.getUrlEncoder.withoutPadding().encodeToString(bytes)
  }
  def digest(token: String): String =
    MessageDigest
      .getInstance("SHA-256")
      .digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8))
      .map(b => f"${b & 0xff}%02x")
      .mkString
}

/** A bounded, atomic ten-minute limiter for this single local server process. */
final class RateLimiter private (state: Ref[IO, Map[String, (Long, Int)]]) {
  def allow(key: String, limit: Int): IO[Boolean] = IO.realTime.map(_.toSeconds).flatMap { now =>
    state.modify { all =>
      val fresh = all.filter { case (_, (start, _)) => now - start < 600 }
      val (start, count) = fresh.getOrElse(key, (now, 0))
      if (count >= limit || (!fresh.contains(key) && fresh.size >= 10000)) (fresh, false)
      else (fresh.updated(key, (start, count + 1)), true)
    }
  }
}
object RateLimiter {
  def create: IO[RateLimiter] =
    Ref.of[IO, Map[String, (Long, Int)]](Map.empty).map(new RateLimiter(_))
}
