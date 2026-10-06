ThisBuild / scalaVersion := "3.4.2"
ThisBuild / organization := "local.deepsky"
ThisBuild / version := "1.0.0"

lazy val root = (project in file("."))
  .settings(
    name := "deep-sky-backend",
    Compile / mainClass := Some("deepsky.Main"),
    Compile / run / fork := true,
    Test / fork := true,
    Test / parallelExecution := false,
    libraryDependencies ++= Seq(
      "org.http4s" %% "http4s-ember-server" % "0.23.30",
      "org.http4s" %% "http4s-dsl" % "0.23.30",
      "org.http4s" %% "http4s-circe" % "0.23.30",
      "io.circe" %% "circe-generic" % "0.14.10",
      "io.circe" %% "circe-parser" % "0.14.10",
      "org.tpolecat" %% "doobie-core" % "1.0.0-RC6",
      "org.tpolecat" %% "doobie-hikari" % "1.0.0-RC6",
      "org.tpolecat" %% "doobie-postgres" % "1.0.0-RC6",
      "org.postgresql" % "postgresql" % "42.7.13",
      "org.flywaydb" % "flyway-core" % "13.9.0",
      "org.flywaydb" % "flyway-database-postgresql" % "13.9.0",
      "com.password4j" % "password4j" % "1.8.4",
      "ch.qos.logback" % "logback-classic" % "1.5.18",
      "org.typelevel" %% "munit-cats-effect" % "2.0.0" % Test
    )
  )
