package deepsky.domain

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.time.{Instant, LocalDate}
import java.util.{Locale, UUID}

final case class User(id: UUID, username: String)
object User { given Encoder[User] = deriveEncoder }
final case class Credentials(username: String, password: String)
object Credentials { given Decoder[Credentials] = deriveDecoder }
final case class ObservationDraft(
    `object`: String,
    kind: String,
    date: LocalDate,
    location: String,
    equipment: String,
    sky: String,
    text: String,
    telescope: Option[String] = None,
    camera: Option[String] = None,
    latitude: Option[Double] = None,
    longitude: Option[Double] = None,
    seeing: Option[Double] = None,
    cloudCover: Option[Double] = None,
    humidity: Option[Double] = None
)
object ObservationDraft { given Decoder[ObservationDraft] = deriveDecoder }
final case class Observation(
    id: UUID,
    `object`: String,
    kind: String,
    date: LocalDate,
    location: String,
    equipment: String,
    sky: String,
    text: String,
    createdAt: Instant,
    telescope: Option[String] = None,
    camera: Option[String] = None,
    latitude: Option[Double] = None,
    longitude: Option[Double] = None,
    seeing: Option[Double] = None,
    cloudCover: Option[Double] = None,
    humidity: Option[Double] = None
)
object Observation { given Encoder[Observation] = deriveEncoder }
final case class ApiError(status: Int, code: String, message: String)
    extends RuntimeException(message)

object Validation {
  def credentials(value: Credentials): Either[ApiError, Credentials] = {
    val username = value.username.toLowerCase(Locale.ROOT)
    if (!username.matches("[a-z0-9_]{3,32}"))
      Left(ApiError(400, "invalid_username", "用户名须为 3–32 位字母、数字或下划线。"))
    else if (value.password.length < 12 || value.password.length > 128)
      Left(ApiError(400, "invalid_password", "密码须为 12–128 个字符。"))
    else Right(value.copy(username = username)) // Password whitespace is significant.
  }

  def observation(value: ObservationDraft): Either[ApiError, ObservationDraft] = {
    val lengthsValid = value.`object`.length <= 100 && value.location.length <= 120 &&
      value.equipment.length <= 160 && value.text.length <= 10000 &&
      value.telescope.forall(_.length <= 160) && value.camera.forall(_.length <= 160)
    def range(number: Option[Double], min: Double, max: Double): Boolean =
      number.forall(n => n.isFinite && n >= min && n <= max)
    val conditionsValid = range(value.latitude, -90, 90) && range(value.longitude, -180, 180) &&
      (value.latitude.isDefined == value.longitude.isDefined) &&
      range(value.seeing, 0.01, 100) && range(value.cloudCover, 0, 100) && range(
        value.humidity,
        0,
        100
      )
    val valid =
      lengthsValid && conditionsValid && value.`object`.trim.nonEmpty && value.text.trim.nonEmpty &&
        Set("nebula", "galaxy", "cluster", "other").contains(value.kind) &&
        Set("通透", "轻霾", "薄云", "多云", "未记录").contains(value.sky) &&
        value.date.getYear >= 1 && value.date.getYear <= 9999
    if (!valid) Left(ApiError(400, "invalid_observation", "请检查目标、日期、坐标、天空数据与笔记长度。"))
    else
      Right(
        value.copy(
          `object` = value.`object`.trim,
          location = value.location.trim,
          equipment = value.equipment.trim,
          telescope = value.telescope.map(_.trim),
          camera = value.camera.map(_.trim),
          text = value.text.trim
        )
      )
  }
}
