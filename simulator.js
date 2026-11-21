// simulator.js - Webブラウザ用計算ロジック

// -----------------------------------------------------------
// 1. 固定データ定義
// -----------------------------------------------------------
const EVENT_DAYS = 3;
const BASE_ITEMS = {
    "パスI": { items: 14, cost: 1600 },
    "パスII": { items: 30, cost: 3200 },
    "ダイヤ交換": { items: 30, cost: 0 },
    "デイリー": { items: 4 * EVENT_DAYS, cost: 0 },
};

const DAILY_PACKS_CHAIN = [
    { items: 2, cost: 160, name: "限定パック 2個", label: "限定パック 2個 (160円)" },
    { items: 6, cost: 800, name: "限定パック 6個", label: "限定パック 6個 (800円)" },
    { items: 10, cost: 1600, name: "限定パック 10個", label: "限定パック 10個 (1,600円)" },
    { items: 20, cost: 3200, name: "限定パック 20個", label: "限定パック 20個 (3,200円)" }
];

const UNLIMITED_PACK = {
    items: 45,
    cost: 8000,
    label: "都度購入 45個パック"
};

const CHAIN_PACK_OPTIONS = [
    { items: 0, cost: 0, details: [] },
    { items: 2, cost: 160, details: [DAILY_PACKS_CHAIN[0]] },
    { items: 8, cost: 960, details: [DAILY_PACKS_CHAIN[0], DAILY_PACKS_CHAIN[1]] },
    { items: 18, cost: 2560, details: [DAILY_PACKS_CHAIN[0], DAILY_PACKS_CHAIN[1], DAILY_PACKS_CHAIN[2]] },
    { items: 38, cost: 5760, details: DAILY_PACKS_CHAIN }
];

// -----------------------------------------------------------
// 2. メイン実行関数 (HTMLから呼び出される)
// -----------------------------------------------------------

function runSimulator() {
    const outputElement = document.getElementById('output');
    const targetItemValue = parseInt(document.querySelector('input[name="targetItem"]:checked').value);
    outputElement.innerHTML = calculateOptimalCost(targetItemValue);
}

// -----------------------------------------------------------
// 3. 表示用の部品
// -----------------------------------------------------------

function yen(n) { return n.toLocaleString() + '円'; }

function rowHtml(name, cost, note) {
    return `<li><span class="n">${name}${note ? `<small>${note}</small>` : ''}</span><span class="p">${yen(cost)}</span></li>`;
}

function cardHtml(title, chip, rows) {
    return `<section class="card">
  <div class="card-head"><h3>${title}</h3><span class="chip">${chip}</span></div>
  <ul>${rows.join('')}</ul>
</section>`;
}

function totalHtml(label, cost, sub) {
    return `<div class="total">
  <div class="total-label">${label}</div>
  <div class="total-num">${yen(cost)}</div>
  <div class="total-sub">${sub}</div>
</div>`;
}

// -----------------------------------------------------------
// 4. 計算ロジック本体 (calculateOptimalCost)
// -----------------------------------------------------------

function calculateOptimalCost(targetItemValue) {
    const targetItem = targetItemValue;

    if (targetItem !== 270 && targetItem !== 450) {
        return `<p class="error">エラー：無効な目標値「${targetItem}」が渡されました。</p>`;
    }

    // 必須アイテムの計算
    let baseItemsTotal = 0;
    let baseCostTotal = 0;
    const baseRows = [];
    for (const key in BASE_ITEMS) {
        baseItemsTotal += BASE_ITEMS[key].items;
        baseCostTotal += BASE_ITEMS[key].cost;
        if (BASE_ITEMS[key].items > 0) {
            baseRows.push(rowHtml(key, BASE_ITEMS[key].cost, `${BASE_ITEMS[key].items}個`));
        }
    }
    const baseCard = cardHtml('必須購入', `期間中合計 ${baseItemsTotal}個 / ${yen(baseCostTotal)}`, baseRows);

    const requiredItems = targetItem - baseItemsTotal;

    if (requiredItems <= 0) {
        return totalHtml(`目標 ${targetItem}個に必要な合計費用`, baseCostTotal,
            `必須購入のみで達成 ／ 総購入 ${baseItemsTotal}個 ／ 余り ${-requiredItems}個`) + baseCard;
    }

    // 3日間の連鎖パックの購入パターン（5^3 = 125パターン）を試行する
    let bestPlan = null;
    let minCost = Infinity;

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            for (let k = 0; k < 5; k++) {
                let currentCost = baseCostTotal;
                let currentItems = baseItemsTotal;
                const planDetails = {};

                const dayPatterns = [
                    { dayIndex: 1, pattern: CHAIN_PACK_OPTIONS[i] },
                    { dayIndex: 2, pattern: CHAIN_PACK_OPTIONS[j] },
                    { dayIndex: 3, pattern: CHAIN_PACK_OPTIONS[k] }
                ];

                for (const { dayIndex, pattern } of dayPatterns) {
                    currentCost += pattern.cost;
                    currentItems += pattern.items;

                    planDetails[dayIndex] = {
                        items: pattern.items,
                        cost: pattern.cost,
                        rows: pattern.details.map(p => rowHtml(p.name, p.cost))
                    };
                }

                const shortfall = targetItem - currentItems;

                if (shortfall > 0) {
                    const packsNeeded = Math.ceil(shortfall / UNLIMITED_PACK.items);
                    const unlimitedItemsTotal = packsNeeded * UNLIMITED_PACK.items;
                    const unlimitedCostTotal = packsNeeded * UNLIMITED_PACK.cost;

                    currentCost += unlimitedCostTotal;
                    currentItems += unlimitedItemsTotal;

                    const day = EVENT_DAYS;
                    planDetails[day].items += unlimitedItemsTotal;
                    planDetails[day].cost += unlimitedCostTotal;
                    planDetails[day].rows.push(rowHtml(
                        `${UNLIMITED_PACK.label} × ${packsNeeded}回`,
                        unlimitedCostTotal,
                        `${unlimitedItemsTotal}個（${yen(UNLIMITED_PACK.cost)} × ${packsNeeded}）`
                    ));
                }

                if (currentItems >= targetItem && currentCost < minCost) {
                    minCost = currentCost;
                    bestPlan = {
                        totalCost: currentCost,
                        totalPurchased: currentItems,
                        excessItems: currentItems - targetItem,
                        purchasePlan: planDetails
                    };
                }
            }
        }
    }

    if (!bestPlan) {
        return '<p class="error">エラー: 最適な購入プランが見つかりませんでした。目標値が高すぎる可能性があります。</p>';
    }

    let html = totalHtml(`目標 ${targetItem}個に必要な合計費用`, bestPlan.totalCost,
        `総購入 ${bestPlan.totalPurchased}個 ／ 余り ${bestPlan.excessItems}個`);
    html += baseCard;

    for (let day = 1; day <= EVENT_DAYS; day++) {
        const plan = bestPlan.purchasePlan[day];
        const rows = plan.rows.length > 0 ? plan.rows : ['<li class="none">この日は購入なし</li>'];
        html += cardHtml(`${day}日目の追加購入`, `${plan.items.toLocaleString()}個 / ${yen(plan.cost)}`, rows);
    }
    return html;
}
