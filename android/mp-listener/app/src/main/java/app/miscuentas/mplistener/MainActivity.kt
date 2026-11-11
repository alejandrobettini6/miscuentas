package app.miscuentas.mplistener

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val url = findViewById<EditText>(R.id.url)
        val anon = findViewById<EditText>(R.id.anon)
        val token = findViewById<EditText>(R.id.token)
        url.setText(prefs.getString(KEY_URL, ""))
        anon.setText(prefs.getString(KEY_ANON, ""))
        token.setText(prefs.getString(KEY_TOKEN, ""))

        findViewById<Button>(R.id.save).setOnClickListener {
            prefs.edit()
                .putString(KEY_URL, url.text.toString().trim().trimEnd('/'))
                .putString(KEY_ANON, anon.text.toString().trim())
                .putString(KEY_TOKEN, token.text.toString().trim())
                .apply()
            Toast.makeText(this, "Guardado", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.access).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
    }

    companion object {
        const val PREFS = "mp_listener"
        const val KEY_URL = "url"
        const val KEY_ANON = "anon"
        const val KEY_TOKEN = "token"
    }
}
