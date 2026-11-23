package expo.modules.pictureinpicture

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Rational
import androidx.annotation.RequiresApi
import androidx.core.app.OnPictureInPictureModeChangedProvider
import androidx.core.app.OnUserLeaveHintProvider
import androidx.core.app.PictureInPictureModeChangedInfo
import androidx.core.os.bundleOf
import androidx.core.util.Consumer
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Picture in picture da tela inteira (no Android o modo é da Activity, não de uma view):
 * entra na janelinha 16:9, entra sozinho ao sair do app (quando ligado) e avisa o JS
 * ao entrar e sair.
 */
class PictureInPictureModule : Module() {
  /** Entrar sozinho ao sair do app (botão home ou gesto). */
  private var autoEnter = false
  private var attachedTo: Activity? = null

  private val modeListener = Consumer<PictureInPictureModeChangedInfo> { info ->
    sendEvent("onChange", bundleOf("active" to info.isInPictureInPictureMode))
    updateRendering()
  }

  /**
   * Na janelinha a Activity fica pausada, e com ela o React Native para de aplicar as mudanças
   * na tela (o FabricUIManager pausa no onHostPause): a janelinha ficava congelada na sala
   * inteira em vez de mostrar só o vídeo. Enquanto a janelinha estiver aberta, a tela continua
   * sendo atualizada; fora dela, segue o ciclo normal da Activity.
   */
  private val lifecycleObserver = LifecycleEventObserver { _, event ->
    if (event == Lifecycle.Event.ON_PAUSE) updateRendering()
  }

  private fun updateRendering() {
    val activity = attachedTo ?: return
    // Depois do onPause da Activity (que pausa o React Native) terminar.
    mainHandler.post {
      val context = appContext.reactContext as? ReactContext ?: return@post
      val uiManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC)
        as? LifecycleEventListener ?: return@post
      val inPip =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && activity.isInPictureInPictureMode
      val resumed = (activity as? LifecycleOwner)
        ?.lifecycle?.currentState?.isAtLeast(Lifecycle.State.RESUMED) == true
      if (inPip) {
        uiManager.onHostResume()
      } else if (!resumed) {
        uiManager.onHostPause()
      }
    }
  }

  private val mainHandler = Handler(Looper.getMainLooper())

  // Android 12+ entra sozinho (setAutoEnterEnabled). Antes disso, entra quando o usuário sai.
  private val leaveHintListener = Runnable {
    if (autoEnter && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) enter()
  }

  private val activity: Activity?
    get() = appContext.currentActivity

  private fun isSupported(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      activity?.packageManager?.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE) == true

  @RequiresApi(Build.VERSION_CODES.O)
  private fun params(): PictureInPictureParams {
    val builder = PictureInPictureParams.Builder().setAspectRatio(Rational(16, 9))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setAutoEnterEnabled(autoEnter)
      // O vídeo é uma página web: redimensionar "liso" deixaria a imagem esticada no meio.
      builder.setSeamlessResizeEnabled(false)
    }
    return builder.build()
  }

  private fun enter(): Boolean {
    val activity = activity ?: return false
    if (!isSupported() || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    return try {
      activity.enterPictureInPictureMode(params())
    } catch (e: IllegalStateException) {
      false
    }
  }

  private fun attach() {
    val activity = activity ?: return
    if (attachedTo === activity) return
    detach()
    (activity as? OnPictureInPictureModeChangedProvider)
      ?.addOnPictureInPictureModeChangedListener(modeListener)
    (activity as? OnUserLeaveHintProvider)?.addOnUserLeaveHintListener(leaveHintListener)
    (activity as? LifecycleOwner)?.lifecycle?.addObserver(lifecycleObserver)
    attachedTo = activity
  }

  private fun detach() {
    val activity = attachedTo ?: return
    (activity as? OnPictureInPictureModeChangedProvider)
      ?.removeOnPictureInPictureModeChangedListener(modeListener)
    (activity as? OnUserLeaveHintProvider)?.removeOnUserLeaveHintListener(leaveHintListener)
    (activity as? LifecycleOwner)?.lifecycle?.removeObserver(lifecycleObserver)
    attachedTo = null
  }

  override fun definition() = ModuleDefinition {
    Name("PictureInPicture")

    Events("onChange")

    Function("isSupported") { isSupported() }

    Function("isActive") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && activity?.isInPictureInPictureMode == true
    }

    AsyncFunction("enter") {
      attach()
      enter()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setAutoEnter") { enabled: Boolean ->
      autoEnter = enabled
      attach()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && isSupported()) {
        activity?.setPictureInPictureParams(params())
      }
    }.runOnQueue(Queues.MAIN)

    OnStartObserving { attach() }

    OnActivityEntersForeground { attach() }

    OnActivityDestroys { detach() }

    OnDestroy { detach() }
  }
}
