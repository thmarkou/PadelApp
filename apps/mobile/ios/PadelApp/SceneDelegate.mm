#import "SceneDelegate.h"
#import "AppDelegate.h"

#import <React/RCTLinkingManager.h>

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  [appDelegate startReactNativeInWindowScene:(UIWindowScene *)scene];
  self.window = appDelegate.window;

  NSURL *url = connectionOptions.URLContexts.allObjects.firstObject.URL;
  if (url) {
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:url options:@{}];
  }

  NSUserActivity *activity = connectionOptions.userActivities.anyObject;
  if (activity) {
    [RCTLinkingManager application:UIApplication.sharedApplication
              continueUserActivity:activity
                restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *_Nullable restorableObjects){
                }];
  }
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  NSURL *url = URLContexts.allObjects.firstObject.URL;
  if (!url) {
    return;
  }
  [RCTLinkingManager application:UIApplication.sharedApplication openURL:url options:@{}];
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity
{
  [RCTLinkingManager application:UIApplication.sharedApplication
            continueUserActivity:userActivity
              restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *_Nullable restorableObjects){
              }];
}

@end
