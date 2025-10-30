// simulator.js - Webブラウザ用計算ロジック

// -----------------------------------------------------------
// 1. 固定データ定義
// -----------------------------------------------------------
const EVENT_DAYS = 3;
const BASE_ITEMS = {
    "パスI": { items: 14, cost: 1340 },
    "パスII": { items: 30, cost: 2780 },
    "ダイヤ交換": { items: 30, cost: 0 },
    "デイリー": { items: 4 * EVENT_DAYS, cost: 0 },
};

const DAILY_PACKS_CHAIN = [
    { items: 2, cost: 132, label: "限定パック 2個 (132円)" },
    { items: 6, cost: 670, label: "限定パック 6個 (670円)" },
    { items: 10, cost: 1340, label: "限定パック 10個 (1,340円)" },
    { items: 20, cost: 2780, label: "限定パック 20個 (2,780円)" }
];

const UNLIMITED_PACK = {
    items: 45,
    cost: 6780,
    label: "都度購入 45個パック"
};

const CHAIN_PACK_OPTIONS = [
    { items: 0, cost: 0, details: [] },
    { items: 2, cost: 132, details: [DAILY_PACKS_CHAIN[0]] },
    { items: 8, cost: 802, details: [DAILY_PACKS_CHAIN[0], DAILY_PACKS_CHAIN[1]] },
    { items: 18, cost: 2142, details: [DAILY_PACKS_CHAIN[0], DAILY_PACKS_CHAIN[1], DAILY_PACKS_CHAIN[2]] },
    { items: 38, cost: 4922, details: DAILY_PACKS_CHAIN }
];

// -----------------------------------------------------------
// 2. メイン実行関数 (HTMLから呼び出される)
// -----------------------------------------------------------

function runSimulator() {
    const outputElement = document.getElementById('output');
    
    // HTMLのラジオボタンから目標値を取得
    const targetItemValue = parseInt(document.querySelector('input[name="targetItem"]:checked').value);
    
    // 非同期処理を考慮せず、同期的に計算関数を呼び出す (Web環境ではScriptableのasync/awaitは不要)
    const result = calculateOptimalCost(targetItemValue);
    
    // 結果をHTMLに出力
    outputElement.textContent = result;
}


// -----------------------------------------------------------
// 3. 計算ロジック本体 (calculateOptimalCost)
// -----------------------------------------------------------

function calculateOptimalCost(targetItemValue) {
    // === ここに前回の最終版の calculateOptimalCost 関数の内容を丸ごとコピーします ===
    // (ScriptableのAPI呼び出し部分を削除し、純粋な計算ロジックのみを使用)
    // ... (前回のcalculateOptimalCost関数のコードをそのまま貼り付け) ...
    
    let targetItem = targetItemValue;

    if (targetItem !== 270 && targetItem !== 450) {
         return `エラー：目標値の取得失敗\n\n無効な目標値「${targetItem}」が渡されました。`;
    }

    const TARGET = { targetItem: targetItem, label: `目標アイテム ${targetItem}個` };

    // 必須アイテムの計算
    let baseItemsTotal = 0;
    let baseCostTotal = 0;
    let baseDetails = [];
    for (const key in BASE_ITEMS) {
        baseItemsTotal += BASE_ITEMS[key].items;
        baseCostTotal += BASE_ITEMS[key].cost;
        if (BASE_ITEMS[key].items > 0) {
             baseDetails.push(`・${key}: ${BASE_ITEMS[key].items}個 (${BASE_ITEMS[key].cost.toLocaleString()}円)`);
        }
    }

    let requiredItems = targetItem - baseItemsTotal;
    
    if (requiredItems <= 0) {
        return `
--- ${TARGET.label} ---
✅ **目標達成に必要な合計費用: ${baseCostTotal.toLocaleString()}円** (必須購入のみ)
[必須購入 (期間中合計 ${baseItemsTotal}個)]
${baseDetails.join('\n')}
--- 補足 ---
・総購入アイテム数: ${baseItemsTotal}個
・目標達成後の余り: ${-requiredItems}個
`;
    }
    
    // -------------------------------------------------------------------------
    // 3日間の連鎖パックの購入パターン（5^3 = 125パターン）を試行する
    // -------------------------------------------------------------------------
    
    let bestPlan = null;
    let minCost = Infinity;

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            for (let k = 0; k < 5; k++) {
                let currentCost = baseCostTotal;
                let currentItems = baseItemsTotal;
                let planDetails = {};
                
                const dayPatterns = [
                    { dayIndex: 1, pattern: CHAIN_PACK_OPTIONS[i] },
                    { dayIndex: 2, pattern: CHAIN_PACK_OPTIONS[j] },
                    { dayIndex: 3, pattern: CHAIN_PACK_OPTIONS[k] }
                ];
                
                for (const { dayIndex, pattern } of dayPatterns) {
                    currentCost += pattern.cost;
                    currentItems += pattern.items;
                    
                    let details = pattern.details.map(p => `・${p.label.split('(')[0].trim()}`);
                    if (details.length === 0) {
                        details = ['・この日は限定パックの購入なし'];
                    }
                    
                    planDetails[dayIndex] = {
                        items: pattern.items,
                        cost: pattern.cost,
                        details: details
                    };
                }
                
                let shortfall = targetItem - currentItems;

                if (shortfall > 0) {
                    let packsNeeded = Math.ceil(shortfall / UNLIMITED_PACK.items);
                    let unlimitedItemsTotal = packsNeeded * UNLIMITED_PACK.items;
                    let unlimitedCostTotal = packsNeeded * UNLIMITED_PACK.cost;

                    currentCost += unlimitedCostTotal;
                    currentItems += unlimitedItemsTotal;

                    let day = EVENT_DAYS;
                    let detailLine = `・${UNLIMITED_PACK.label} を ${packsNeeded}回購入: ${unlimitedItemsTotal}個 (${unlimitedCostTotal.toLocaleString()}円)`;
                    
                    planDetails[day].items += unlimitedItemsTotal;
                    planDetails[day].cost += unlimitedCostTotal;
                    planDetails[day].details.push(detailLine);
                }

                if (currentItems >= targetItem && currentCost < minCost) {
                    minCost = currentCost;
                    bestPlan = {
                        totalCost: currentCost,
                        totalPurchased: currentItems,
                        excessItems: currentItems - targetItem,
                        purchasePlan: planDetails,
                        baseDetails: baseDetails
                    };
                }
            }
        }
    }

    if (!bestPlan) {
        return "エラー: 最適な購入プランが見つかりませんでした。目標値が高すぎる可能性があります。";
    }

    let dailyPlanString = '';
    for (let day = 1; day <= EVENT_DAYS; day++) {
        let plan = bestPlan.purchasePlan[day] || { items: 0, cost: 0, details: ['・この日は購入なし'] };
        
        dailyPlanString += `
🗓️ **${day}日目の追加購入 (合計 ${plan.items.toLocaleString()}個 / ${plan.cost.toLocaleString()}円)**
${plan.details.join('\n')}
`;
    }

    let finalMessage = `
--- ${TARGET.label} ---
✅ **目標達成に必要な合計費用: ${bestPlan.totalCost.toLocaleString()}円**

[必須購入 (期間中合計 ${baseItemsTotal}個)]
${bestPlan.baseDetails.join('\n')}
${dailyPlanString}
--- 補足 ---
・総購入アイテム数: ${bestPlan.totalPurchased}個
・目標達成後の余り: ${bestPlan.excessItems}個
`;
    
    let messageTitle = `イベント課金 最安値シミュレーター (最適化)`;
    return messageTitle + '\n\n' + finalMessage;

    // === calculateOptimalCost関数の内容終了 ===
}
