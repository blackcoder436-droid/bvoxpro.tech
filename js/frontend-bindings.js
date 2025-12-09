// Frontend bindings: populate forms with API data
function populateUserUI(user) {
    if (!user) return;
    // Fill summary box if present
    const summary = document.getElementById('userSummary');
    if (summary) {
        summary.innerHTML = `
            <strong>${user.username || user.userid || '—'}</strong><br/>
            ID: ${user.userid || user.uid || user._id || '—'}<br/>
            Balance: ${user.balance ?? '—'}<br/>
            Role: ${user.role || '—'}<br/>
            KYC: ${user.kycStatus || '—'}
        `;
        summary.style.display = 'block';
    }

    // Populate topup user id input if present
    const topupUser = document.getElementById('topupUserId');
    if (topupUser) topupUser.value = user.userid || user.uid || user._id || '';

    // Populate withdrawal user id input
    const withdrawUser = document.getElementById('withdrawalUserId');
    if (withdrawUser) withdrawUser.value = user.userid || user.uid || user._id || '';

    // Populate trade/mining/wallet forms
    const tradeUser = document.getElementById('tradeUserId');
    if (tradeUser) tradeUser.value = user.userid || user.uid || user._id || '';

    const miningUser = document.getElementById('miningUserId');
    if (miningUser) miningUser.value = user.userid || user.uid || user._id || '';

    const walletUser = document.getElementById('walletUserId');
    if (walletUser) walletUser.value = user.userid || user.uid || user._id || '';

    const kycUser = document.getElementById('kycUserId');
    if (kycUser) kycUser.value = user.userid || user.uid || user._id || '';

    // If balances block exists, render balances
    const balancesElem = document.getElementById('userBalances');
    if (balancesElem && user.balances) {
        balancesElem.innerHTML = Object.keys(user.balances).map(k => `${k}: ${user.balances[k]}`).join('<br/>');
        balancesElem.style.display = 'block';
    }
}

// small helper to clear summary
function clearUserUI() {
    const summary = document.getElementById('userSummary');
    if (summary) summary.innerHTML = '';
    const balancesElem = document.getElementById('userBalances');
    if (balancesElem) balancesElem.innerHTML = '';
}
