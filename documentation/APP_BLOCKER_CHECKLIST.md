# App Blocker - Pre-Launch Checklist

## 🔧 Development Setup

### Initial Setup
- [ ] Capacitor installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- [ ] Capacitor configured (`capacitor.config.ts`)
- [ ] Next.js configured for static export (`output: 'export'`)
- [ ] Android platform added (`npx cap add android`)
- [ ] Plugin files created in `src/plugins/app-blocker/`
- [ ] Native Android files created in `android/app/src/main/java/`
- [ ] MainActivity updated to register plugin

### Build & Sync
- [ ] `npm run build` completes successfully
- [ ] `out` directory generated with static files
- [ ] `npx cap sync` completes without errors
- [ ] Android Studio opens project without errors

## 🏗️ Code Verification

### TypeScript Layer
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Plugin types match native implementation
- [ ] Settings page imports plugin correctly
- [ ] Hook `useAppBlockerCompletion` is typed correctly

### Android Layer
- [ ] All Kotlin files compile
- [ ] No Java/Kotlin syntax errors
- [ ] Imports are correct
- [ ] Package names match (`com.kaiwaai.app`)
- [ ] Plugin registered in MainActivity

### Android Manifest
- [ ] All permissions declared
- [ ] Service declared with correct attributes
- [ ] FlashcardBlockActivity declared
- [ ] `xmlns:tools` namespace added

## 📱 Testing - Basic Functionality

### Permissions
- [ ] App launches successfully
- [ ] Can navigate to Settings → App Blocker
- [ ] "Grant Permissions" button works
- [ ] Usage Stats permission screen opens
- [ ] Display Over Apps permission screen opens
- [ ] Permissions are detected as granted after enabling

### Monitoring
- [ ] Can start monitoring
- [ ] Notification appears when monitoring active
- [ ] Can stop monitoring
- [ ] Monitoring status persists after app restart
- [ ] Service survives app being closed

### App Blocking
- [ ] Can see list of installed apps
- [ ] Can add app to block list
- [ ] Can remove app from block list
- [ ] Blocked apps list persists after restart
- [ ] Can set flashcard requirement count

### Interception
- [ ] Opening blocked app triggers KaiwaAI
- [ ] FlashcardBlockActivity appears
- [ ] WebView loads flashcard page
- [ ] Back button is disabled (can't escape)
- [ ] Page displays correctly in WebView

### Completion
- [ ] Completing flashcards sets completion flag
- [ ] Can access blocked app after completion
- [ ] Flag can be reset (manual or automatic)

## 🧪 Testing - Edge Cases

### Service Robustness
- [ ] Service survives low memory
- [ ] Service restarts if killed
- [ ] Service works after device reboot
- [ ] Service handles rapid app switching

### Permission Edge Cases
- [ ] Handles permission denial gracefully
- [ ] Detects when permissions are revoked
- [ ] Shows appropriate error messages
- [ ] Doesn't crash if permissions missing

### App Blocking Edge Cases
- [ ] Handles system apps correctly
- [ ] Doesn't block KaiwaAI itself
- [ ] Handles apps that launch sub-activities
- [ ] Handles apps with custom launchers

### Data Persistence
- [ ] Settings survive app restart
- [ ] Settings survive device reboot
- [ ] Handles corrupted SharedPreferences
- [ ] Handles empty blocked list

## 🎨 UI/UX Review

### Settings Page
- [ ] Layout looks good on phone
- [ ] Layout looks good on tablet
- [ ] Buttons are easy to tap (min 44x44dp)
- [ ] Text is readable
- [ ] Icons are clear
- [ ] Loading states shown
- [ ] Error states handled

### Flashcard Block Screen
- [ ] Full screen overlay works
- [ ] Content is centered
- [ ] Text is readable
- [ ] Navigation works
- [ ] Completion flow is clear

### Notifications
- [ ] Notification icon is set
- [ ] Notification text is clear
- [ ] Notification is not dismissible (or doesn't kill service)
- [ ] Notification priority is appropriate

## 🔐 Security Review

### Permissions
- [ ] Only necessary permissions requested
- [ ] Permissions explained to user
- [ ] No over-privileged access
- [ ] Permissions usage aligns with Play Store policies

### Data Storage
- [ ] No sensitive data stored
- [ ] SharedPreferences uses MODE_PRIVATE
- [ ] No data leaked to logs
- [ ] No unencrypted user data

### Service Safety
- [ ] Service can't be abused
- [ ] No DoS vulnerabilities
- [ ] No race conditions
- [ ] Proper null checks

## ⚡ Performance

### Battery Usage
- [ ] 1 second polling interval is acceptable
- [ ] Service doesn't wake device unnecessarily
- [ ] Proper use of foreground service
- [ ] Battery optimization works correctly

### Memory Usage
- [ ] No memory leaks in service
- [ ] No memory leaks in WebView
- [ ] Proper cleanup on destroy
- [ ] Reasonable memory footprint

### CPU Usage
- [ ] Polling doesn't spike CPU
- [ ] UsageStats queries are efficient
- [ ] No busy loops
- [ ] Reasonable CPU usage

## 📝 Documentation

### User-Facing
- [ ] README explains feature
- [ ] Quick start guide is clear
- [ ] Screenshots included (if needed)
- [ ] Troubleshooting section complete

### Developer-Facing
- [ ] Architecture documented
- [ ] API documented
- [ ] Code has comments
- [ ] Setup instructions clear

### Legal
- [ ] Privacy policy updated (if collecting data)
- [ ] Terms of service updated (if needed)
- [ ] Attribution for libraries
- [ ] License file included

## 🚀 Pre-Release

### Build Configuration
- [ ] App signing configured
- [ ] ProGuard/R8 rules added (if needed)
- [ ] Build variants configured (debug/release)
- [ ] Version code incremented
- [ ] Version name set

### APK/AAB Testing
- [ ] Release build compiles
- [ ] Release APK installs on device
- [ ] All features work in release build
- [ ] No crashes in release build
- [ ] Performance is acceptable

### Play Store Prep
- [ ] App listing prepared
- [ ] Screenshots captured
- [ ] Feature graphic created
- [ ] Description written
- [ ] Privacy policy linked
- [ ] Target API level compliant

## 🎯 Post-Launch

### Monitoring
- [ ] Crash reporting set up (Firebase, Sentry, etc.)
- [ ] Analytics tracking (if desired)
- [ ] User feedback mechanism
- [ ] Support email/channel

### Maintenance Plan
- [ ] Bug fix process defined
- [ ] Update schedule planned
- [ ] Deprecation strategy considered
- [ ] Backup plan for critical issues

## ✅ Final Sign-Off

- [ ] All critical items above are checked
- [ ] Team has reviewed and approved
- [ ] QA has tested and approved
- [ ] Stakeholders are informed
- [ ] Ready for launch! 🚀

---

## Notes

Use this checklist to ensure nothing is missed before launching the app blocker feature. Check items off as you complete them, and add notes about any issues or concerns.

**Date:** _____________  
**Tester:** _____________  
**Build Version:** _____________  
**Device Tested:** _____________  

**Additional Notes:**
___________________________________________________________
___________________________________________________________
___________________________________________________________
