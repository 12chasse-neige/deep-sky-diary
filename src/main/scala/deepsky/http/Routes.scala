package deepsky.http

import cats.effect.IO
import cats.syntax.all.*
import deepsky.config.Config
import deepsky.db.Repository
import deepsky.domain.*
import deepsky.services.{AuthService, RateLimiter, Security}
import io.circe.{Decoder, Json}
import io.circe.syntax.*
import org.http4s.*
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import java.util.UUID

final class Routes(config: Config, repo: Repository, auth: AuthService, limiter: RateLimiter) {
  private val cookieName =
    if (config.secureCookie) "__Host-deep_sky_session" else "deep_sky_session"
  private def header(req: Request[IO], name: String): Option[String] =
    req.headers.get(CIString(name)).map(_.head.value)
  private def sessionHash(req: Request[IO]): Option[String] =
    req.cookies
      .find(_.name == cookieName)
      .map(_.content)
      .filter(_.matches("[A-Za-z0-9_-]{43}"))
      .map(Security.digest)
  private def user(req: Request[IO]): IO[User] = sessionHash(req)
    .traverse(repo.session)
    .map(_.flatten)
    .flatMap(_.liftTo[IO](ApiError(401, "unauthenticated", "请登录后继续。")))

  // Unsafe browser requests require BOTH a known Origin and a custom header.
  // Cross-site HTML forms cannot set this header; cross-site fetch preflights receive no CORS grant.
  private def csrf(req: Request[IO]): IO[Unit] =
    if (
      header(req, "Origin").exists(config.origins.contains) &&
      header(req, "X-Requested-With").contains("DeepSkyDiary")
    ) IO.unit
    else IO.raiseError(ApiError(403, "csrf_rejected", "请求来源无效，请从本站重试。"))

  private def body[A: Decoder](
      req: Request[IO],
      fields: Set[String],
      optional: Set[String] = Set.empty
  ): IO[A] =
    req.body.take(65537).compile.to(Array).flatMap { bytes =>
      if (bytes.length > 65536) IO.raiseError(ApiError(413, "body_too_large", "请求内容过长。"))
      else if (
        !header(req, "Content-Type").exists(
          _.takeWhile(_ != ';').trim.equalsIgnoreCase("application/json")
        )
      )
        IO.raiseError(ApiError(415, "invalid_content_type", "请使用 JSON 请求。"))
      else
        IO.fromEither(
          io.circe.parser
            .parse(new String(bytes, java.nio.charset.StandardCharsets.UTF_8))
            .left
            .map(_ => ApiError(400, "invalid_json", "请求格式无效。"))
        ).flatMap { json =>
          if (
            !json.asObject.exists(obj =>
              fields.subsetOf(obj.keys.toSet) && obj.keys.toSet.subsetOf(fields ++ optional)
            )
          )
            IO.raiseError(ApiError(400, "invalid_fields", "请求字段无效。"))
          else
            IO.fromEither(json.as[A].left.map(_ => ApiError(400, "invalid_fields", "请检查输入格式与日期。")))
        }
    }

  private def authRate(req: Request[IO]): IO[Unit] = {
    // Never trust client-supplied X-Forwarded-For. Local Vite requests share its loopback address.
    val ip = req.remoteAddr.map(_.toString).getOrElse("local")
    limiter.allow(s"ip:$ip", 30).flatMap {
      case true  => IO.unit
      case false => IO.raiseError(ApiError(429, "rate_limited", "尝试过于频繁，请十分钟后重试。"))
    }
  }
  private def accountRate(username: String): IO[Unit] =
    limiter.allow(s"user:${username.toLowerCase(java.util.Locale.ROOT)}", 10).flatMap {
      case true  => IO.unit
      case false => IO.raiseError(ApiError(429, "rate_limited", "尝试过于频繁，请十分钟后重试。"))
    }
  private def cookie(token: String, clear: Boolean = false): Header.Raw = Header.Raw(
    CIString("Set-Cookie"),
    s"$cookieName=$token; Path=/; HttpOnly; SameSite=Strict; Max-Age=${if (clear) 0 else 604800}${
        if (config.secureCookie) "; Secure" else ""
      }"
  )
  private def authenticate(req: Request[IO], register: Boolean): IO[Response[IO]] = for {
    _ <- csrf(req)
    _ <- authRate(req)
    credentials <- body[deepsky.domain.Credentials](req, Set("username", "password"))
    _ <- accountRate(credentials.username)
    result <-
      if (register) auth.register(credentials) else auth.login(credentials, sessionHash(req))
    response <- (if (register) Created(result._1.asJson) else Ok(result._1.asJson))
  } yield response.putHeaders(cookie(result._2))

  private val routes = HttpRoutes.of[IO] {
    case GET -> Root / "api" / "health" =>
      repo.healthy.attempt.flatMap {
        case Right(_) => Ok(Json.obj("status" -> Json.fromString("ready")))
        case Left(_)  => ServiceUnavailable(Json.obj("status" -> Json.fromString("unavailable")))
      }
    case req @ POST -> Root / "api" / "auth" / "register" => authenticate(req, true)
    case req @ POST -> Root / "api" / "auth" / "login"    => authenticate(req, false)
    case req @ GET -> Root / "api" / "auth" / "me"        => user(req).flatMap(u => Ok(u.asJson))
    case req @ POST -> Root / "api" / "auth" / "logout" =>
      csrf(req) *> sessionHash(req).traverse_(repo.revoke) *> NoContent().map(
        _.putHeaders(cookie("", true))
      )
    case req @ GET -> Root / "api" / "observations" =>
      user(req).flatMap(u => repo.list(u.id)).flatMap(v => Ok(v.asJson))
    case req @ POST -> Root / "api" / "observations" =>
      for {
        _ <- csrf(req)
        owner <- user(req)
        draft <- body[ObservationDraft](
          req,
          Set("object", "kind", "date", "location", "equipment", "sky", "text"),
          Set("telescope", "camera", "latitude", "longitude", "seeing", "cloudCover", "humidity")
        )
        valid <- IO.fromEither(Validation.observation(draft))
        result <- repo.create(owner.id, valid)
        response <- Created(result.asJson)
      } yield response
    case req @ DELETE -> Root / "api" / "observations" / id =>
      for {
        _ <- csrf(req)
        owner <- user(req)
        uuid <- IO.fromEither(
          scala.util
            .Try(UUID.fromString(id))
            .toEither
            .left
            .map(_ => ApiError(404, "not_found", "记录不存在。"))
        )
        deleted <- repo.delete(owner.id, uuid)
        response <-
          if (deleted) NoContent() else IO.raiseError(ApiError(404, "not_found", "记录不存在。"))
      } yield response
  }

  private def error(value: ApiError): IO[Response[IO]] = IO.pure(
    Response[IO](Status.fromInt(value.status).getOrElse(Status.InternalServerError))
      .withEntity(
        Json.obj(
          "error" -> Json.obj("code" -> value.code.asJson, "message" -> value.message.asJson)
        )
      )
  )

  val app: HttpApp[IO] = cats.data.Kleisli { req =>
    routes
      .run(req)
      .getOrElseF(error(ApiError(404, "not_found", "接口不存在。")))
      .handleErrorWith {
        case value: ApiError => error(value)
        case _: java.sql.SQLException =>
          error(ApiError(503, "database_unavailable", "数据库暂时不可用，请稍后重试。"))
        case unexpected =>
          IO.println(s"Request failed: ${unexpected.getClass.getSimpleName}") *>
            error(ApiError(500, "internal_error", "服务暂时不可用，请稍后重试。"))
      }
      .map(
        _.putHeaders(
          Header.Raw(CIString("Cache-Control"), "no-store"),
          Header.Raw(CIString("X-Content-Type-Options"), "nosniff")
        )
      )
  }
}
