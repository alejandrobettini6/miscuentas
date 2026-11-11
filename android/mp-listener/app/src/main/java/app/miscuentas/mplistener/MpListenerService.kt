package app.miscuentas.mplistener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.time.Instant

class MpListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != MERCADO_PAGO_PACKAGE) return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val joined = "$title $body"
        if (!SPEND.containsMatchIn(joined)) return

        val prefs = getSharedPreferences(MainActivity.PREFS, MODE_PRIVATE)
        val base = prefs.getString(MainActivity.KEY_URL, "").orEmpty()
        val anon = prefs.getString(MainActivity.KEY_ANON, "").orEmpty()
        val token = prefs.getString(MainActivity.KEY_TOKEN, "").orEmpty()
        if (base.isBlank() || anon.isBlank() || token.isBlank()) return

        val externalId = sha256("${sbn.packageName}|${sbn.postTime}|$title|$body").take(64)
        val payload = JSONObject()
            .put("p_token", token)
            .put("p_external_id", externalId)
            .put("p_title", title.take(180))
            .put("p_body", body.take(500))
            .put("p_posted_at", Instant.ofEpochMilli(sbn.postTime).toString())

        Thread {
            post(base, anon, payload)
        }.start()
    }

    private fun post(base: String, anon: String, payload: JSONObject) {
        val connection = (URL("$base/rest/v1/rpc/ingest_mp_notification").openConnection() as HttpURLConnection)
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", anon)
            connection.setRequestProperty("Authorization", "Bearer $anon")
            connection.setRequestProperty("Prefer", "return=minimal")
            OutputStreamWriter(connection.outputStream).use { it.write(payload.toString()) }
            connection.responseCode
        } catch (_: Exception) {
            // El próximo aviso reintenta. No guardamos el texto en un log.
        } finally {
            connection.disconnect()
        }
    }

    private fun sha256(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val MERCADO_PAGO_PACKAGE = "com.mercadopago.wallet"
        private val SPEND = Regex("pagaste|transferiste|enviaste|\\bqr\\b", RegexOption.IGNORE_CASE)
    }
}
