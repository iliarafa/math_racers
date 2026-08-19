import UIKit
import Capacitor

// iOS 26+ requires apps to adopt the UIScene lifecycle; without it UIKit traps at
// scene creation on iOS 27 (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
//
// Capacitor's SceneDelegateProxy (added in @capacitor/ios 8.5.0) forwards custom URL
// scheme opens and universal links to the bridge. It is `public` rather than `open`, so
// it cannot be subclassed here — we conform to UIWindowSceneDelegate and forward to its
// shared instance, which preserves the deep-link handling the AppDelegate used to do.
//
// The window is created from Main.storyboard, now declared per-scene via
// UISceneStoryboardFile in Info.plist.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

}
