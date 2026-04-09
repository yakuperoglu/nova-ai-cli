/**
 * i18n — Language Engine
 *
 * Provides `t(key, vars?)` for all user-facing CLI strings.
 * Default language: "en" (English). Configurable via `nova lang set <en|tr>`.
 *
 * Supported languages: en | tr
 */

import { getConfig } from "../services/config.js";

export type Language = "en" | "tr";
export const SUPPORTED_LANGUAGES: Language[] = ["en", "tr"];

/** Reads the active language from config (default: "en"). */
export function getLanguage(): Language {
    const lang = getConfig().language;
    if (lang && SUPPORTED_LANGUAGES.includes(lang as Language)) {
        return lang as Language;
    }
    return "en";
}

/**
 * Resolves a string key to the active language, optionally interpolating
 * `{placeholder}` variables.
 *
 * Falls back to English when a key is missing from the active translation.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
    const lang = getLanguage();
    let str = STRINGS[lang]?.[key] ?? STRINGS["en"]?.[key] ?? key;
    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
    }
    return str;
}

// ─── String Tables ─────────────────────────────────────────

const STRINGS: Record<Language, Record<string, string>> = {
    // ════════════════════════════════════════════════════════
    //  ENGLISH
    // ════════════════════════════════════════════════════════
    en: {
        // Common
        "common.abort": "Aborted.",
        "common.processing": "[WAIT] Processing...",
        "common.unknownError": "An unknown error occurred.",

        // Auth
        "auth.enterKey": "Enter your API key",
        "auth.keyHint": "Provider is auto-detected from key format: sk-ant… → Anthropic, sk-… → OpenAI, other → Gemini",
        "auth.forceProviderTip": "To force a provider: nova auth set --provider <gemini|openai|anthropic> <key>",
        "auth.providerLabel": "Provider: {provider}",
        "auth.shellHistoryWarn": "Your API key may be saved in shell history.",
        "auth.shellHistoryTip": "Tip: Use 'nova auth' (interactive) for safer input.",
        "auth.saveSuccess": "API key saved successfully!",
        "auth.inferredHint": "Provider inferred from key format. If wrong: nova auth set --provider <name> <key>",
        "auth.storedIn": "Stored in: {path}",
        "auth.permissions": "Permissions: owner-only (600)",
        "auth.switchHint": "Key stored for '{provider}'. Active provider unchanged. Switch: nova provider set {provider}",
        "auth.allSet": "You're all set! Try:",
        "auth.saveFailed": "Failed to save API key.",
        "auth.noKeyProvided": "No API key provided.",
        "auth.invalidProvider": "Invalid provider. Valid values: {providers}",
        "auth.activeProvider": "Active provider: {provider}",
        "auth.keyConfigured": "API key is configured for this provider",
        "auth.keyMasked": "Key: {key}",
        "auth.noKeyConfigured": "No key for active provider. Run: nova auth   or   nova auth set --provider {provider} <key>",
        "auth.otherProviders": "Keys saved for other providers: {providers}",
        "auth.configPath": "Config: {path}",

        // Ask
        "ask.thinking": "Nova is thinking...",
        "ask.failedToReach": "Failed to reach Nova.",
        "ask.fileWarning": "[WARN] \"{file}\": {reason}",
        "ask.fileNotFound": "not found, skipping",
        "ask.fileIsDir": "is a directory, skipping",
        "ask.fileTooLarge": "too large (>1MB), skipping",
        "ask.fileCannotRead": "could not be read, skipping",
        "ask.fileAttached": "File attached: {file}",
        "ask.noPrompt": "Please provide a prompt.",
        "ask.noPromptExample": "Example: nova ask \"list all files in this folder\"",
        "ask.blocked": "BLOCKED — Dangerous command detected!",
        "ask.blockedReason": "Reason: {reason}",
        "ask.blockedSafety": "Nova refused to execute this command for your safety.",
        "ask.confirmWarning": "[WARN] This command has risks. Execute anyway?",
        "ask.confirmSafe": "Do you approve this action?",
        "ask.cancelled": "Operation cancelled.",
        "ask.success": "[OK] Operation completed successfully.",
        "ask.execFailed": "Execution failed: {error}",
        "ask.fixPrompt": "Would you like Nova to analyze this error and generate a new solution?",
        "ask.fixCancelled": "Auto-Fix cancelled.",
        "ask.exited": "Exited.",

        // Model
        "model.emptyName": "Please enter a valid model id (e.g. gemini-2.5-pro, gpt-4o-mini, claude-3-5-haiku-20241022)",
        "model.changeSuccess": "Active model changed successfully: {model}",
        "model.changeHint": "All commands and chats will now be processed using this model.",
        "model.providerLabel": "Provider: {provider}",
        "model.currentModel": "Current model: {model}",
        "model.defaultModel": "Recommended default for this provider: {model}",
        "model.changeCmd": "To change: nova model set <model-id>",

        // Provider
        "provider.invalid": "Invalid provider. Must be one of: {providers}",
        "provider.presetsHint": "OpenAI-compatible presets: {presets}",
        "provider.invalidPreset": "Unknown preset: '{preset}'. Valid presets: {presets}",
        "provider.setSuccess": "Active provider: {provider}",
        "provider.preset": "Preset    : {preset}",
        "provider.baseURL": "Base URL  : {url}",
        "provider.recommendedModel": "Recommended model: {model}",
        "provider.modelCmd": "To set model: nova model set {model}",
        "provider.authHint": "API key: 'nova auth' or 'nova auth set --provider {provider} <key>'",
        "provider.activeProvider": "Active provider: {provider}",
        "provider.defaultModel": "Default model: {model}",
        "provider.openaiBaseURL": "Base URL (OpenAI): {url}",
        "provider.changeCmd": "To change: nova provider set <gemini|openai|anthropic>",
        "provider.presetCmd": "Preset: nova provider set openai --preset <{presets}>",
        "provider.customURLCmd": "Custom URL: nova provider set openai --base-url <url>",
        "provider.presetsTitle": "OpenAI-Compatible Presets",
        "provider.presetsUsage": "nova provider set openai --preset <name>",

        // Remember
        "remember.empty": "Please type the rule you want me to remember.",
        "remember.emptyExample": "Example: nova remember \"Always use TypeScript\"",
        "remember.success": "New rule saved: \"{rule}\"",
        "remember.hint": "Nova will consider this in all future commands.",
        "remember.failed": "Error saving rule.",

        // Memory
        "memory.empty": "Nova's persistent memory is currently empty.",
        "memory.emptyHint": "To add a new rule: nova remember \"Always use TypeScript\"",
        "memory.title": "Nova's Persistent Memory:",
        "memory.readError": "Error reading memory.",
        "memory.clearSuccess": "Persistent memory cleared. Nova won't remember previous rules.",
        "memory.clearError": "Error clearing memory.",
        "memory.invalidIndex": "Please enter a valid number. (e.g.: nova memory --remove 1)",
        "memory.removeSuccess": "Rule deleted: \"{rule}\"",
        "memory.removeNotFound": "Rule number {index} not found.",
        "memory.removeHint": "To see existing rules: nova memory --list",
        "memory.removeError": "Error deleting rule.",

        // Reset
        "reset.success": "Chat history cleared. Nova won't remember previous conversations.",
        "reset.error": "Error clearing history.",

        // Audit
        "audit.title": "Nova Audit Trail (Recent Operations)",
        "audit.filePath": "File Path: {path}",
        "audit.empty": "No operations recorded yet.",

        // Theme
        "theme.emptyName": "Please enter a valid theme name. e.g.: 'nova theme set ocean'",
        "theme.notFound": "'{theme}' theme not found.",
        "theme.notFoundHint": "To see available themes: 'nova theme list'",
        "theme.setSuccess": "UI theme updated: {theme}",
        "theme.setHint": "Outputs will now be displayed using this color scheme.",
        "theme.galleryTitle": "Nova Theme Gallery",
        "theme.galleryHint": "To select a new theme: 'nova theme set <name>'",
        "theme.activeLabel": "(active)",

        // Update
        "update.title": "Nova CLI Auto-Update",
        "update.targetDir": "Target directory: {dir}",
        "update.notGitRepo": "Nova CLI is not running from a Git repository.",
        "update.notGitHint": "Only versions installed via 'git clone' can be self-updated.",
        "update.checkingGitHub": "Checking for updates on GitHub...",
        "update.downloading": "Downloading source code (git pull)...",
        "update.alreadyUpToDate": "Nova is already up to date!",
        "update.alreadyForce": "Already up to date, but rebuilding due to --force (-f).",
        "update.downloadSuccess": "New source code downloaded successfully.",
        "update.installing": "Updating dependencies (npm install)...",
        "update.installSuccess": "Package dependencies updated.",
        "update.building": "Rebuilding Nova CLI (npm run build)...",
        "update.buildSuccess": "Build complete.",
        "update.success": "Nova CLI updated successfully!",
        "update.successHint": "You can start using the new features.",
        "update.error": "An error occurred during update.",
        "update.detail": "Detail: {detail}",
        "update.manual": "Try these commands manually:",

        // AI errors
        "ai.noKey": "API key is not configured.",
        "ai.authHint": "Please authenticate first:",
        "ai.getKeyFrom": "Get your key from: {url}",
        "ai.quota": "API quota exceeded. Check your limits at {url}",
        "ai.invalidKey": "Invalid or revoked API key. Run: nova auth",
        "ai.emptyResponse": "AI returned an empty response. Please rephrase your request.",
        "ai.parseError": "Failed to parse AI response. Raw output: {raw}",
        "ai.timeout": "{provider} request timed out (25s). Check your internet connection.",
        "ai.networkError": "Could not reach {provider} server. Check your internet connection.",
        "ai.serverError": "{provider} server error ({code}). Please try again later.",
        "ai.openaiInvalid": "OpenAI API key is invalid. Run: nova auth set --provider openai <key>",
        "ai.openaiQuota": "OpenAI quota or rate limit reached. Check your account limits.",
        "ai.anthropicInvalid": "Anthropic API key is invalid. Run: nova auth set --provider anthropic <key>",
        "ai.anthropicQuota": "Anthropic quota or rate limit reached.",
        "ai.openaiNotJson": "OpenAI response is not JSON: {raw}",
        "ai.openaiEmpty": "OpenAI returned empty content.",
        "ai.anthropicNotJson": "Anthropic response is not JSON: {raw}",
        "ai.anthropicEmpty": "Anthropic returned empty text.",

        // Lang
        "lang.setSuccess": "Language set to: {lang}",
        "lang.invalid": "Invalid language. Supported: {langs}",
        "lang.current": "Current language: {lang}",
        "lang.hint": "This controls both CLI messages and the AI response language.",
        "lang.resetHint": "To switch back to English: nova lang set en",
    },

    // ════════════════════════════════════════════════════════
    //  TURKISH
    // ════════════════════════════════════════════════════════
    tr: {
        // Common
        "common.abort": "İptal edildi.",
        "common.processing": "[BEKLE] İşleniyor...",
        "common.unknownError": "Bilinmeyen bir hata oluştu.",

        // Auth
        "auth.enterKey": "API anahtarını girin",
        "auth.keyHint": "Sağlayıcı anahtar biçiminden tahmin edilir: sk-ant… → Anthropic, sk-… → OpenAI, diğer → Gemini",
        "auth.forceProviderTip": "Sağlayıcıyı zorlamak için: nova auth set --provider <gemini|openai|anthropic> <anahtar>",
        "auth.providerLabel": "Sağlayıcı: {provider}",
        "auth.shellHistoryWarn": "API anahtarı shell geçmişine düşebilir.",
        "auth.shellHistoryTip": "İpucu: Güvenli giriş için 'nova auth' (etkileşimli) kullanın.",
        "auth.saveSuccess": "API anahtarı başarıyla kaydedildi!",
        "auth.inferredHint": "Sağlayıcı anahtar biçiminden tahmin edildi. Yanlışsa: nova auth set --provider <ad> <anahtar>",
        "auth.storedIn": "Kaydedildi: {path}",
        "auth.permissions": "İzinler: yalnızca sahibi (600)",
        "auth.switchHint": "Anahtar '{provider}' için kaydedildi. Aktif sağlayıcı değişmedi. Geçiş: nova provider set {provider}",
        "auth.allSet": "Hazırsınız! Deneyin:",
        "auth.saveFailed": "API anahtarı kaydedilemedi.",
        "auth.noKeyProvided": "API anahtarı girilmedi.",
        "auth.invalidProvider": "Geçersiz sağlayıcı. Geçerli değerler: {providers}",
        "auth.activeProvider": "Aktif sağlayıcı: {provider}",
        "auth.keyConfigured": "Bu sağlayıcı için API anahtarı tanımlı",
        "auth.keyMasked": "Anahtar: {key}",
        "auth.noKeyConfigured": "Aktif sağlayıcı için anahtar yok. Çalıştırın: nova auth   veya   nova auth set --provider {provider} <anahtar>",
        "auth.otherProviders": "Kayıtlı diğer sağlayıcı anahtarları: {providers}",
        "auth.configPath": "Config: {path}",

        // Ask
        "ask.thinking": "Nova düşünüyor...",
        "ask.failedToReach": "Nova'ya ulaşılamadı.",
        "ask.fileWarning": "[UYARI] \"{file}\": {reason}",
        "ask.fileNotFound": "bulunamadı, atlanıyor",
        "ask.fileIsDir": "klasör, atlanıyor",
        "ask.fileTooLarge": "çok büyük (>1MB), atlanıyor",
        "ask.fileCannotRead": "okunamadı, atlanıyor",
        "ask.fileAttached": "Dosya bağlama eklendi: {file}",
        "ask.noPrompt": "Lütfen bir istek girin.",
        "ask.noPromptExample": "Örnek: nova ask \"bu klasördeki dosyaları listele\"",
        "ask.blocked": "ENGELLENDİ — Tehlikeli komut tespit edildi!",
        "ask.blockedReason": "Neden: {reason}",
        "ask.blockedSafety": "Nova bu komutu güvenliğiniz için çalıştırmayı reddetti.",
        "ask.confirmWarning": "[UYARI] Bu komut risk içeriyor. Yine de çalıştırılsın mı?",
        "ask.confirmSafe": "Bu işlemi onaylıyor musunuz?",
        "ask.cancelled": "İşlem iptal edildi.",
        "ask.success": "[OK] İşlem başarıyla tamamlandı.",
        "ask.execFailed": "Çalıştırma başarısız: {error}",
        "ask.fixPrompt": "Nova bu hatayı analiz edip yeni bir çözüm üretsin mi?",
        "ask.fixCancelled": "Otomatik Düzeltme iptal edildi.",
        "ask.exited": "Çıkıldı.",

        // Model
        "model.emptyName": "Geçerli bir model id girin (örn. gemini-2.5-pro, gpt-4o-mini, claude-3-5-haiku-20241022)",
        "model.changeSuccess": "Aktif model başarıyla değiştirildi: {model}",
        "model.changeHint": "Bundan sonraki tüm komutlar bu model ile işlenecek.",
        "model.providerLabel": "Sağlayıcı: {provider}",
        "model.currentModel": "Mevcut model: {model}",
        "model.defaultModel": "Bu sağlayıcı için önerilen varsayılan: {model}",
        "model.changeCmd": "Değiştirmek için: nova model set <model-id>",

        // Provider
        "provider.invalid": "Geçersiz sağlayıcı. Şunlardan biri olmalı: {providers}",
        "provider.presetsHint": "OpenAI-compatible presetler: {presets}",
        "provider.invalidPreset": "Bilinmeyen preset: '{preset}'. Geçerli presetler: {presets}",
        "provider.setSuccess": "Aktif sağlayıcı: {provider}",
        "provider.preset": "Preset    : {preset}",
        "provider.baseURL": "Base URL  : {url}",
        "provider.recommendedModel": "Önerilen model: {model}",
        "provider.modelCmd": "Model ayarlamak için: nova model set {model}",
        "provider.authHint": "API anahtarı: 'nova auth' veya 'nova auth set --provider {provider} <anahtar>'",
        "provider.activeProvider": "Aktif sağlayıcı: {provider}",
        "provider.defaultModel": "Varsayılan model: {model}",
        "provider.openaiBaseURL": "Base URL (OpenAI): {url}",
        "provider.changeCmd": "Değiştirmek için: nova provider set <gemini|openai|anthropic>",
        "provider.presetCmd": "Preset: nova provider set openai --preset <{presets}>",
        "provider.customURLCmd": "Özel URL: nova provider set openai --base-url <url>",
        "provider.presetsTitle": "OpenAI-Compatible Presetler",
        "provider.presetsUsage": "nova provider set openai --preset <ad>",

        // Remember
        "remember.empty": "Hatırlamamı istediğiniz kuralı yazın.",
        "remember.emptyExample": "Örnek: nova remember \"Her zaman TypeScript kullan\"",
        "remember.success": "Yeni kural kaydedildi: \"{rule}\"",
        "remember.hint": "Nova bundan sonraki tüm komutlarda bu kuralı dikkate alacak.",
        "remember.failed": "Kural kaydedilemedi.",

        // Memory
        "memory.empty": "Nova'nın kalıcı hafızası şu an boş.",
        "memory.emptyHint": "Yeni kural eklemek için: nova remember \"Her zaman TypeScript kullan\"",
        "memory.title": "Nova'nın Kalıcı Hafızası:",
        "memory.readError": "Hafıza okunurken hata.",
        "memory.clearSuccess": "Kalıcı hafıza temizlendi. Nova önceki kuralları hatırlamayacak.",
        "memory.clearError": "Hafıza temizlenirken hata.",
        "memory.invalidIndex": "Geçerli bir sayı girin. (örn.: nova memory --remove 1)",
        "memory.removeSuccess": "Kural başarıyla silindi: \"{rule}\"",
        "memory.removeNotFound": "{index} numaralı kural bulunamadı.",
        "memory.removeHint": "Mevcut kuralları görmek için: nova memory --list",
        "memory.removeError": "Kural silinirken hata.",

        // Reset
        "reset.success": "Sohbet geçmişi temizlendi. Nova önceki konuşmaları hatırlamayacak.",
        "reset.error": "Geçmiş temizlenirken hata.",

        // Audit
        "audit.title": "Nova Denetim Kaydı (Son İşlemler)",
        "audit.filePath": "Dosya Yolu: {path}",
        "audit.empty": "Henüz kayıt yok.",

        // Theme
        "theme.emptyName": "Geçerli bir tema adı girin. örn.: 'nova theme set ocean'",
        "theme.notFound": "'{theme}' teması bulunamadı.",
        "theme.notFoundHint": "Mevcut temaları görmek için: 'nova theme list'",
        "theme.setSuccess": "UI teması güncellendi: {theme}",
        "theme.setHint": "Çıktılar artık bu renk şemasıyla gösterilecek.",
        "theme.galleryTitle": "Nova Tema Galerisi",
        "theme.galleryHint": "Yeni tema seçmek için: 'nova theme set <ad>'",
        "theme.activeLabel": "(aktif)",

        // Update
        "update.title": "Nova CLI Otomatik Güncelleme",
        "update.targetDir": "Hedef dizin: {dir}",
        "update.notGitRepo": "Nova CLI bir Git deposundan çalışmıyor.",
        "update.notGitHint": "'git clone' ile yüklenen sürümler kendi kendini güncelleyebilir.",
        "update.checkingGitHub": "GitHub'da güncellemeler kontrol ediliyor...",
        "update.downloading": "Kaynak kod indiriliyor (git pull)...",
        "update.alreadyUpToDate": "Nova zaten güncel!",
        "update.alreadyForce": "Zaten güncel, ancak -f bayrağı nedeniyle yeniden derleniyor.",
        "update.downloadSuccess": "Yeni kaynak kod başarıyla indirildi.",
        "update.installing": "Bağımlılıklar güncelleniyor (npm install)...",
        "update.installSuccess": "Paket bağımlılıkları güncellendi.",
        "update.building": "Nova CLI yeniden derleniyor (npm run build)...",
        "update.buildSuccess": "Derleme tamamlandı.",
        "update.success": "Nova CLI başarıyla güncellendi!",
        "update.successHint": "Yeni özellikleri kullanmaya başlayabilirsiniz.",
        "update.error": "Güncelleme sırasında hata oluştu.",
        "update.detail": "Detay: {detail}",
        "update.manual": "Bu komutları manuel olarak deneyin:",

        // AI errors
        "ai.noKey": "API anahtarı yapılandırılmamış.",
        "ai.authHint": "Kimlik doğrulama:",
        "ai.getKeyFrom": "Anahtarı al: {url}",
        "ai.quota": "API kotası aşıldı. Limitleri kontrol et: {url}",
        "ai.invalidKey": "Geçersiz veya iptal edilmiş API anahtarı. 'nova auth' çalıştırın.",
        "ai.emptyResponse": "AI boş yanıt döndü. İsteğinizi yeniden ifade etmeyi deneyin.",
        "ai.parseError": "AI yanıtı çözümlenemedi. Ham çıktı: {raw}",
        "ai.timeout": "{provider} isteği zaman aşımına uğradı (25s). İnternet bağlantınızı kontrol edin.",
        "ai.networkError": "{provider} sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edin.",
        "ai.serverError": "{provider} sunucu hatası ({code}). Biraz sonra tekrar deneyin.",
        "ai.openaiInvalid": "OpenAI API anahtarı geçersiz. Çalıştırın: nova auth set --provider openai <anahtar>",
        "ai.openaiQuota": "OpenAI kotası veya hız limiti. Hesap limitlerini kontrol edin.",
        "ai.anthropicInvalid": "Anthropic API anahtarı geçersiz. Çalıştırın: nova auth set --provider anthropic <anahtar>",
        "ai.anthropicQuota": "Anthropic kotası veya hız limiti.",
        "ai.openaiNotJson": "OpenAI yanıtı JSON değil: {raw}",
        "ai.openaiEmpty": "OpenAI boş içerik döndü.",
        "ai.anthropicNotJson": "Anthropic yanıtı JSON değil: {raw}",
        "ai.anthropicEmpty": "Anthropic boş metin döndü.",

        // Lang
        "lang.setSuccess": "Dil ayarlandı: {lang}",
        "lang.invalid": "Geçersiz dil. Desteklenenler: {langs}",
        "lang.current": "Mevcut dil: {lang}",
        "lang.hint": "Bu ayar hem CLI mesajlarını hem AI yanıt dilini etkiler.",
        "lang.resetHint": "İngilizceye dönmek için: nova lang set en",
    },
};
