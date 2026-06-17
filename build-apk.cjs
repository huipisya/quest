const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const ANDROID_DIR = path.join(PROJECT_DIR, 'android');
const ENV_DIR = path.resolve(PROJECT_DIR, '..', 'android-env');
const JDK_DIR = path.join(ENV_DIR, 'jdk');
const SDK_DIR = path.join(ENV_DIR, 'sdk');

const GRADLEW = path.join(ANDROID_DIR, 'gradlew.bat');
const SOURCE_APK = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const TARGET_APK = path.join(PROJECT_DIR, 'КВЕСТ.apk');

async function main() {
  console.log('=== STARTING AUTOMATED LIFEQUEST APK BUILD ===\n');

  // 1. Build Web Distribution
  console.log('1. Compiling React + Vite web application...');
  execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_DIR });
  console.log('Web distribution compiled successfully.\n');

  // 2. Sync Web Assets with Capacitor
  console.log('2. Syncing assets with Capacitor Android project...');
  execSync('npx cap sync android', { stdio: 'inherit', cwd: PROJECT_DIR });
  console.log('Capacitor assets sync complete.\n');

  // 3. Compile Native Android APK using local SDK/JDK
  console.log('3. Compiling Android APK with local Gradle wrapper...');
  
  const env = {
    ...process.env,
    JAVA_HOME: JDK_DIR,
    ANDROID_HOME: SDK_DIR,
    PATH: `${path.join(JDK_DIR, 'bin')};${process.env.PATH}`
  };

  console.log(`Using JDK: ${JDK_DIR}`);
  console.log(`Using SDK: ${SDK_DIR}`);

  try {
    execSync(`"${GRADLEW}" assembleDebug`, { env, stdio: 'inherit', cwd: ANDROID_DIR });
    console.log('\nGradle build completed successfully!\n');
  } catch (err) {
    console.error('Gradle build failed. Please check build logs.');
    process.exit(1);
  }

  // 4. Move and rename APK for easy access
  console.log('4. Locating and copying compiled APK...');
  if (fs.existsSync(SOURCE_APK)) {
    if (fs.existsSync(TARGET_APK)) {
      fs.rmSync(TARGET_APK);
    }
    fs.copyFileSync(SOURCE_APK, TARGET_APK);
    console.log(`\n🎉 SUCCESS! Compiled APK copied to project root:`);
    console.log(`👉 ${TARGET_APK}\n`);
    console.log('You can now copy this file to your Android phone and install it!');
  } else {
    console.error(`Error: Compiled APK not found at: ${SOURCE_APK}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Build script encountered an error:', err);
  process.exit(1);
});
