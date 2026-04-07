/**
 * Model Command — aktif sağlayıcıya göre model id
 */

import { setModel, getModel, getProvider, DEFAULT_MODELS } from "../services/config.js";
import { theme } from "../utils/theme.js";

export function modelSetCommand(modelName: string): void {
    if (!modelName || modelName.trim() === "") {
        console.log(
            theme.error(
                "[FAIL] Geçerli bir model id girin (örn. gemini-2.5-pro, gpt-4o-mini, claude-3-5-haiku-20241022)"
            )
        );
        return;
    }

    const cleanModel = modelName.trim();
    setModel(cleanModel);

    console.log();
    console.log(theme.success(`  [OK] Active model changed successfully: `) + theme.brand(cleanModel));
    console.log(theme.dim(`  All commands and chats will now be processed using this model.`));
    console.log();
}

export function modelStatusCommand(): void {
    const currentModel = getModel();
    const p = getProvider();
    const def = DEFAULT_MODELS[p];

    console.log();
    console.log(theme.brand("  Sağlayıcı: ") + theme.brand(p));
    console.log(theme.brand("  Mevcut model: ") + theme.brand(currentModel));
    console.log(theme.dim(`  Bu sağlayıcı için önerilen varsayılan: ${def}`));
    console.log(theme.dim("  Değiştirmek için: nova model set <model-id>"));
    console.log();
}
