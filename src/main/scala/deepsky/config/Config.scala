package deepsky.config

final case class Config(
    jdbcUrl: String,
    dbUser: String,
    dbPassword: String,
    host: String,
    port: Int,
    origins: Set[String],
    secureCookie: Boolean
)

object Config {
  // Environment only: secrets must never enter Vite's public environment or Git.
  def load(env: Map[String, String] = sys.env): Config = {
    def required(key: String): String = env
      .get(key)
      .filter(_.nonEmpty)
      .getOrElse(throw new IllegalArgumentException(s"Missing environment variable: $key"))
    Config(
      env.getOrElse("DB_URL", "jdbc:postgresql://127.0.0.1:5432/deep_sky"),
      env.getOrElse("DB_USER", "deep_sky"),
      required("DB_PASSWORD"),
      env.getOrElse("API_HOST", "127.0.0.1"),
      env.getOrElse("API_PORT", "8080").toInt,
      env
        .getOrElse("APP_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173")
        .split(",")
        .map(_.trim)
        .filter(_.nonEmpty)
        .toSet,
      env.getOrElse("COOKIE_SECURE", "false").toBoolean
    )
  }
}
