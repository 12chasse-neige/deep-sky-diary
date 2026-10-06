package deepsky.db

import cats.effect.{IO, Resource}
import doobie.hikari.HikariTransactor
import doobie.util.ExecutionContexts
import org.flywaydb.core.Flyway
import deepsky.config.Config

object Database {
  def migrate(config: Config): IO[Unit] = IO.blocking {
    Flyway
      .configure()
      .dataSource(config.jdbcUrl, config.dbUser, config.dbPassword)
      .locations("classpath:db/migration")
      .cleanDisabled(true)
      .load()
      .migrate()
    ()
  }

  def resource(config: Config): Resource[IO, HikariTransactor[IO]] = for {
    pool <- ExecutionContexts.fixedThreadPool[IO](8)
    xa <- HikariTransactor.newHikariTransactor[IO](
      "org.postgresql.Driver",
      config.jdbcUrl,
      config.dbUser,
      config.dbPassword,
      pool
    )
    _ <- Resource.eval(IO {
      xa.kernel.setMaximumPoolSize(8)
      xa.kernel.setConnectionTimeout(5000)
    })
  } yield xa
}
