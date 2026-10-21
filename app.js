const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // USDT Polygon
const YOUR_CONTRACT_ADDRESS = "0x6F8fa63C85165FcaC7714E3E430Cd3A9cf3c8aB3"; // Contractul tău

let userAccount = null;

// Funcție generare Hash Bytes32
function getRandomBytes32() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return "0x" + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function showStatus(msg, isError = false) {
    const el = document.getElementById("statusText");
    if (!el) return;
    el.style.display = "block";
    el.style.color = isError ? "#f87171" : "#38bdf8";
    el.style.background = isError ? "rgba(248, 113, 113, 0.1)" : "rgba(56, 189, 248, 0.1)";
    el.innerText = msg;
}

// 1. Conectare Portofel
async function connectWallet() {
    showStatus("Se deschide MetaMask...");
    
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask nu este detectat! Dacă ești pe mobil, deschide pagina din browserul din MetaMask.");
        showStatus("MetaMask nu a fost găsit.", true);
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];

        // Verificăm rețeaua Polygon (0x89 = 137)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x89') {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }],
                });
            } catch (switchError) {
                alert("Te rog să comuți rețeaua din MetaMask pe Polygon Mainnet!");
            }
        }

        document.getElementById("connectBtn").innerText = Conectat: ${userAccount.substring(0, 6)}...${userAccount.substring(userAccount.length - 4)};
        document.getElementById("depositSection").style.display = "block";
        document.getElementById("txHash").value = getRandomBytes32();
        showStatus("Portofel conectat!");
    } catch (err) {
        console.error(err);
        showStatus("Eroare la conectare: " + err.message, true);
    }
}

// 2. Depunere (Approve + Deposit)
async function handleDeposit() {
    const amountVal = document.getElementById("amount").value;
    const txHashVal = document.getElementById("txHash").value;
    const depositBtn = document.getElementById("depositBtn");

    if (!amountVal || amountVal <= 0) {
        alert("Introdu o sumă validă!");
        return;
    }

    try {
        depositBtn.disabled = true;
        
        // Conversie USDT 6 zecimale în HEX
        const amountWeiBigInt = BigInt(Math.floor(amountVal * 1000000));
        const amountHex = "0x" + amountWeiBigInt.toString(16);

        // PASUL 1: Approve USDT
        showStatus("Pasul 1/2: Aprobă tranzacția în MetaMask...");
        
        // Function selector approve(address,uint256) -> 0x095ea7b3
        const spenderPadded = YOUR_CONTRACT_ADDRESS.toLowerCase().replace("0x", "").padStart(64, '0');
        const amountPadded = amountWeiBigInt.toString(16).padStart(64, '0');
        const approveData = "0x095ea7b3" + spenderPadded + amountPadded;

        const approveTxHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAccount,
                to: USDT_ADDRESS,
                data: approveData
            }]
        });

        showStatus("Se procesează aprobarea pe Polygon... Te rugăm să aștepți 5-10 secunde.");
        
        // Așteptăm 10 secunde pentru minare
        await new Promise(r => setTimeout(r, 10000));

        // PASUL 2: Deposit în Contractul tău
        showStatus("Pasul 2/2: Confirmă depunerea în MetaMask...");

        // Function selector deposit(bytes32,uint256) -> 0x1de26e16
        const hashClean = txHashVal.replace("0x", "").padStart(64, '0');
        const depositData = "0x1de26e16" + hashClean + amountPadded;

        const depositTxHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAccount,
                to: YOUR_CONTRACT_ADDRESS,
                data: depositData
            }]
        });

        showStatus("✅ Tranzacție trimisă cu succes! Hash: " + depositTxHash.substring(0, 10) + "...");
        document.getElementById("txHash").value = getRandomBytes32();

    } catch (err) {
        console.error(err);
        showStatus("❌ Eroare: " + (err.message || err), true);
    } finally {
        depositBtn.disabled = false;
    }
}

// Atașare Evenimente pe Butoane
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectBtn").addEventListener("click", connectWallet);
    document.getElementById("depositBtn").addEventListener("click", handleDeposit);
});
