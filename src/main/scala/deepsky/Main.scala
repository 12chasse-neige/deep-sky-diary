package deepsky

import cats.effect.{IO, IOApp, Resource}
import com.comcast.ip4s.{Host, Port}
import deepsky.config.Config
import deepsky.db.{Database, Repository}
import deepsky.services.{AuthService, RateLimiter, Security}
import deepsky.http.Routes
import org.http4s.ember.server.EmberServerBuilder

object Main extends IOApp.Simple {
  def run: IO[Unit] = for {
    config <- IO(Config.load())
    _ <- Database.migrate(config)
    _ <- (for {
      xa <- Database.resource(config)
      dummy <- Resource.eval(Security.hashPassword("dummy-password-not-an-account"))
      limiter <- Resource.eval(RateLimiter.create)
      repo = new Repository(xa)
      routes = new Routes(config, repo, new AuthService(repo, dummy), limiter)
      server <- EmberServerBuilder
        .default[IO]
        .withHost(
          Host
            .fromString(config.host)
            .getOrElse(throw new IllegalArgumentException("Invalid API_HOST"))
        )
        .withPort(
          Port
            .fromInt(config.port)
            .getOrElse(throw new IllegalArgumentException("Invalid API_PORT"))
        )
        .withHttpApp(routes.app)
        .build
    } yield server).use(_ =>
      IO.println(s"Deep Sky API ready on ${config.host}:${config.port}") *> IO.never
    )
  } yield ()
}
