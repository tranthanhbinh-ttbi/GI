const { parentPort } = require('worker_threads');
const { pipeline, env } = require('@xenova/transformers');

// Cấu hình Xenova để chạy offline hoặc cache tốt hơn
env.allowLocalModels = false; // Force download if not found (or true if pre-downloaded)
env.useBrowserCache = false;

// Singleton pipeline instance
let classifier = null;

const THRESHOLD = 0.7; // Ngưỡng để coi là toxic

async function initialize() {
    if (!classifier) {
        try {
            // Sử dụng model unitary/toxic-bert vì nó phổ biến và chính xác
            // Hoặc Xenova/toxic-bert (bản lượng tử hóa của unitary)
            classifier = await pipeline('text-classification', 'Xenova/toxic-bert', {
                quantized: true // Chạy nhanh hơn trên CPU
            });
        } catch (err) {
            console.error('[Worker] Model loading failed:', err);
            throw err;
        }
    }
}

parentPort.on('message', async (task) => {
    // task: { id: number, content: string }
    const { id, content } = task;

    try {
        await initialize();

        // Model trả về array các label với score
        // Ví dụ: [{ label: 'toxic', score: 0.9 }, { label: 'severe_toxic', score: 0.1 }...]
        // Xenova/toxic-bert thường trả về top classes.
        // Tuy nhiên, pipeline 'text-classification' mặc định chỉ trả về top 1 label nếu không config return_all_scores
        // Ta cần check cấu hình. Với toxic-bert, ta nên lấy tất cả scores.
        
        const results = await classifier(content, { topk: null }); // topk: null => return all

        // Tìm max score của các label tiêu cực
        let maxScore = 0;
        let flaggedLabel = '';

        // Các label của toxic-bert: toxic, severe_toxic, obscene, threat, insult, identity_hate
        for (const res of results) {
            if (res.score > maxScore) {
                maxScore = res.score;
                flaggedLabel = res.label;
            }
        }

        const isToxic = maxScore > THRESHOLD;

        parentPort.postMessage({
            success: true,
            id,
            toxicityScore: maxScore,
            isToxic,
            label: flaggedLabel
        });

    } catch (error) {
        console.error('[Worker] Inference error:', error);
        parentPort.postMessage({
            success: false,
            id,
            error: error.message
        });
    }
});
