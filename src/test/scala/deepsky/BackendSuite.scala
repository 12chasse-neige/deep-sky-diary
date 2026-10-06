package deepsky

import cats.effect.IO
import cats.syntax.all.*
import deepsky.config.Config
import deepsky.db.{Database, Repository}
import deepsky.domain.*
import deepsky.http.Routes
import deepsky.services.{AuthService, RateLimiter, Security}
import doobie.implicits.*
import io.circe.Json
import io.circe.syntax.*
import org.http4s.{Method, Request, Response, Uri}
import org.http4s.circe.*
import org.typelevel.ci.CIString
import org.http4s.Header
import java.time.LocalDate
import java.util.UUID

class BackendSuite extends munit.CatsEffectSuite {
  test("validation preserves passwords, trims notes, and enforces field limits") {
    val password = "  correct-horse-battery  "
    assertEquals(
      Validation.credentials(Credentials("Alice_1", password)),
      Right(Credentials("alice_1", password))
    )
    assert(Validation.credentials(Credentials("a!", password)).isLeft)
    assert(Validation.credentials(Credentials("alice", "short")).isLeft)
    val draft =
      ObservationDraft(" M31 ", "galaxy", LocalDate.of(2026, 10, 5), "", "", "通透", " light ")
    assertEquals(Validation.observation(draft).toOption.get.text, "light")
    assert(Validation.observation(draft.copy(text = " ")).isLeft)
    assert(Validation.observation(draft.copy(kind = "planet")).isLeft)
    assert(Validation.observation(draft.copy(equipment = "x" * 161)).isLeft)
    assert(Validation.observation(draft.copy(telescope = Some("x" * 161))).isLeft)
    assert(Validation.observation(draft.copy(camera = Some("x" * 161))).isLeft)
    assert(Validation.observation(draft.copy(latitude = Some(40))).isLeft)
    assert(Validation.observation(draft.copy(latitude = Some(91), longitude = Some(0))).isLeft)
    assert(Validation.observation(draft.copy(latitude = Some(0), longitude = Some(-181))).isLeft)
    assert(Validation.observation(draft.copy(seeing = Some(0))).isLeft)
    assert(Validation.observation(draft.copy(cloudCover = Some(101))).isLeft)
    assert(Validation.observation(draft.copy(humidity = Some(-1))).isLeft)
    assert(Validation.observation(draft.copy(seeing = Some(Double.NaN))).isLeft)
    assert(Validation.observation(draft.copy(humidity = Some(Double.PositiveInfinity))).isLeft)
    assert(
      Validation
        .observation(
          draft.copy(
            latitude = Some(0),
            longitude = Some(0),
            seeing = Some(2.1),
            cloudCover = Some(0),
            humidity = Some(100)
          )
        )
        .isRight
    )
  }

  test(
    "PostgreSQL API: migration, accounts, CSRF, isolation, persistence, expiration and rate limits"
  ) {
    val base = Config.load()
    val testUrl = sys.env.getOrElse(
      "TEST_DB_URL",
      throw new IllegalArgumentException("Set TEST_DB_URL to a dedicated test database")
    )
    require(
      testUrl != base.jdbcUrl && testUrl.endsWith("_test"),
      "Integration tests require a separate database ending in _test"
    )
    val config = base.copy(jdbcUrl = testUrl)
    val suffix = UUID.randomUUID().toString.take(8)
    val alice = s"alice_$suffix"
    val bob = s"bob_$suffix"
    val password = "  twelve-plus-secret  "
    def credentials(name: String, pass: String = password) =
      Json.obj("username" -> name.asJson, "password" -> pass.asJson)
    val draft = Json.obj(
      "object" -> "M31".asJson,
      "kind" -> "galaxy".asJson,
      "date" -> "2026-10-05".asJson,
      "location" -> "露台".asJson,
      "equipment" -> "10x50".asJson,
      "sky" -> "通透".asJson,
      "text" -> "银河笔记".asJson
    )
    def req(
        method: Method,
        path: String,
        json: Json = Json.Null,
        token: String = "",
        origin: String = "http://127.0.0.1:5173"
    ) = {
      val r = Request[IO](method, Uri.unsafeFromString(s"/api$path")).putHeaders(
        Header.Raw(CIString("Origin"), origin),
        Header.Raw(CIString("X-Requested-With"), "DeepSkyDiary")
      )
      val withCookie =
        if (token.nonEmpty) r.putHeaders(Header.Raw(CIString("Cookie"), s"deep_sky_session=$token"))
        else r
      if (json.isNull) withCookie else withCookie.withEntity(json)
    }
    def token(r: Response[IO]): String =
      r.headers.get(CIString("Set-Cookie")).get.head.value.split(";").head.split("=", 2)(1)
    def status(r: Response[IO], expected: Int): IO[Unit] = IO(assertEquals(r.status.code, expected))

    Database.migrate(config) *> Database.migrate(config) *> Database.resource(config).use { xa =>
      val repo = new Repository(xa)
      val cleanup = sql"DELETE FROM users WHERE username = $alice OR username = $bob".update.run
        .transact(xa)
        .void
      (for {
        dummy <- Security.hashPassword("dummy-password-for-testing")
        limiter <- RateLimiter.create
        app = new Routes(config, repo, new AuthService(repo, dummy), limiter).app
        unauthorized <- app.run(req(Method.GET, "/observations"))
        _ <- status(unauthorized, 401)
        csrf <- app.run(
          req(Method.POST, "/auth/register", credentials(alice), origin = "https://evil.example")
        )
        _ <- status(csrf, 403)
        noHeader <- app.run(
          req(Method.POST, "/auth/register", credentials(alice))
            .removeHeader(CIString("X-Requested-With"))
        )
        _ <- status(noHeader, 403)
        a <- app.run(req(Method.POST, "/auth/register", credentials(alice)))
        _ <- status(a, 201)
        aToken = token(a)
        _ <- IO(
          assert(
            a.headers
              .get(CIString("Set-Cookie"))
              .get
              .head
              .value
              .contains("HttpOnly; SameSite=Strict")
          )
        )
        duplicate <- app.run(req(Method.POST, "/auth/register", credentials(alice.toUpperCase)))
        _ <- status(duplicate, 409)
        badLogin <- app.run(
          req(Method.POST, "/auth/login", credentials(alice, "wrong-long-password"))
        )
        _ <- status(badLogin, 401)
        b <- app.run(req(Method.POST, "/auth/register", credentials(bob)))
        _ <- status(b, 201)
        bToken = token(b)
        ownerInjection <- app.run(
          req(
            Method.POST,
            "/observations",
            draft.deepMerge(Json.obj("owner_id" -> alice.asJson)),
            aToken
          )
        )
        _ <- status(ownerInjection, 400)
        invalidDate <- app.run(
          req(
            Method.POST,
            "/observations",
            draft.deepMerge(Json.obj("date" -> "2026-02-30".asJson)),
            aToken
          )
        )
        _ <- status(invalidDate, 400)
        invalidText <- app.run(
          req(Method.POST, "/observations", draft.deepMerge(Json.obj("text" -> " ".asJson)), aToken)
        )
        _ <- status(invalidText, 400)
        created <- app.run(req(Method.POST, "/observations", draft, aToken))
        _ <- status(created, 201)
        entry <- created.as[Json]
        id = entry.hcursor.get[String]("id").toOption.get
        _ <- IO(assertEquals(entry.hcursor.get[String]("date").toOption.get, "2026-10-05"))
        aList <- app.run(req(Method.GET, "/observations", token = aToken)).flatMap(_.as[Json])
        _ <- IO(assertEquals(aList.asArray.get.size, 1))
        _ <- IO(assertEquals(entry.hcursor.get[Option[Double]]("seeing").toOption.get, None))
        detailedDraft = draft.deepMerge(
          Json.obj(
            "equipment" -> "".asJson,
            "telescope" -> "80 mm APO".asJson,
            "camera" -> "ASI2600MC Pro".asJson,
            "latitude" -> 40.12.asJson,
            "longitude" -> (-116.40).asJson,
            "seeing" -> 2.1.asJson,
            "cloudCover" -> 0.asJson,
            "humidity" -> 65.asJson
          )
        )
        detailed <- app.run(req(Method.POST, "/observations", detailedDraft, aToken))
        _ <- status(detailed, 201)
        detailedEntry <- detailed.as[Json]
        detailedId = detailedEntry.hcursor.get[String]("id").toOption.get
        invalidCoordinate <- app.run(
          req(
            Method.POST,
            "/observations",
            detailedDraft.deepMerge(Json.obj("latitude" -> 91.asJson)),
            aToken
          )
        )
        _ <- status(invalidCoordinate, 400)
        invalidHumidity <- app.run(
          req(
            Method.POST,
            "/observations",
            detailedDraft.deepMerge(Json.obj("humidity" -> 101.asJson)),
            aToken
          )
        )
        _ <- status(invalidHumidity, 400)
        incompleteCoordinates <- app.run(
          req(
            Method.POST,
            "/observations",
            detailedDraft.deepMerge(Json.obj("longitude" -> Json.Null)),
            aToken
          )
        )
        _ <- status(incompleteCoordinates, 400)
        bList <- app.run(req(Method.GET, "/observations", token = bToken)).flatMap(_.as[Json])
        _ <- IO(assertEquals(bList.asArray.get.size, 0))
        forbiddenDelete <- app.run(req(Method.DELETE, s"/observations/$id", token = bToken))
        _ <- status(forbiddenDelete, 404)
        me <- app.run(req(Method.GET, "/auth/me", token = aToken))
        _ <- status(me, 200)
        hash = Security.digest(aToken)
        _ <-
          sql"UPDATE sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $hash".update.run
            .transact(xa)
        expired <- app.run(req(Method.GET, "/observations", token = aToken))
        _ <- status(expired, 401)
        login <- app.run(req(Method.POST, "/auth/login", credentials(alice)))
        _ <- status(login, 200)
        restoredToken = token(login)
        // A new repository instance still sees committed records: no server-memory persistence.
        aliceUser <- repo.session(Security.digest(restoredToken)).map(_.get)
        persisted <- new Repository(xa).list(aliceUser.id)
        _ <- IO(assertEquals(persisted.size, 2))
        _ <- IO {
          val record = persisted.find(_.id.toString == detailedId).get
          assertEquals(record.telescope, Some("80 mm APO"))
          assertEquals(record.camera, Some("ASI2600MC Pro"))
          assertEquals(record.latitude, Some(40.12))
          assertEquals(record.longitude, Some(-116.40))
          assertEquals(record.seeing, Some(2.1))
          assertEquals(record.cloudCover, Some(0.0))
          assertEquals(record.humidity, Some(65.0))
        }
        deletedDetailed <- app.run(
          req(Method.DELETE, s"/observations/$detailedId", token = restoredToken)
        )
        _ <- status(deletedDetailed, 204)
        deleted <- app.run(req(Method.DELETE, s"/observations/$id", token = restoredToken))
        _ <- status(deleted, 204)
        logout <- app.run(req(Method.POST, "/auth/logout", token = restoredToken))
        _ <- status(logout, 204)
        revoked <- app.run(req(Method.GET, "/auth/me", token = restoredToken))
        _ <- status(revoked, 401)
        rate <- List
          .fill(11)(())
          .traverse(_ =>
            app
              .run(req(Method.POST, "/auth/login", credentials("rate_" + suffix)))
              .map(_.status.code)
          )
        _ <- IO(assertEquals(rate.last, 429))
      } yield ()).guarantee(cleanup)
    }
  }
}
