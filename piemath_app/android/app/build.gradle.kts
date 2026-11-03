import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release гарын үсэг: android/key.properties (gitignore-д, репо PUBLIC — ХЭЗЭЭ Ч commit хийхгүй).
// Жишээ: android/key.properties.example. Файл байхгүй бол debug түлхүүрээр (дэлгүүрт гаргахгүй).
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        FileInputStream(keystorePropertiesFile).use { load(it) }
    }
}
val hasReleaseKey = keystorePropertiesFile.exists()

android {
    namespace = "mn.piemath.app"
    compileSdk = maxOf(36, flutter.compileSdkVersion)
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Bundle ID: эзэн батлах хүртэл санал (PROGRESS.md «Эзний шийдвэр» #1).
        // Дэлгүүрт гарсны дараа ХЭЗЭЭ Ч солигдохгүй.
        applicationId = "mn.piemath.app"
        // Flutter-ийн өгөгдмөл (24 = Android 7). Зорилтот хамгийн сул утас Android 8 (API 26) —
        // PERFORMANCE.md. Залгаасуудын доод хязгаар 24-өөс хэтрэхгүй (secure_storage 24).
        minSdk = flutter.minSdkVersion
        // Google Play: 2026-08-31-ээс шинэ апп, шинэчлэл API 36 (Android 16)-г заавал онилно
        // (COMPLIANCE.md §2.1). Flutter-ийн өгөгдмөл өөрчлөгдсөн ч доош буухгүйн тулд тодорхой бичив.
        targetSdk = maxOf(36, flutter.targetSdkVersion)
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKey) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            // Код, нөөцийн шахалт (PERFORMANCE.md §2: APK < 25 MB).
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // Нативын (.so) crash-ийг Play Console-д уншигдахуйц болгох symbol table AAB-д орно.
            ndk {
                debugSymbolLevel = "SYMBOL_TABLE"
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
