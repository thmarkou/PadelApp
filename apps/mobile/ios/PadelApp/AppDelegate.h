#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
#import <Expo/Expo.h>

@interface AppDelegate : EXAppDelegateWrapper

@property (nonatomic, copy, nullable) NSDictionary *launchOptions;

- (void)startReactNativeInWindowScene:(UIWindowScene *)windowScene;

@end
