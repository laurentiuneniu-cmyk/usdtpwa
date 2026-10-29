// --- CONFIGURARE POLYGON ---
const POLYGON_USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
const POLYGON_CONTRACT = "0x6F8fa63C85165FcaC7714E3E430Cd3A9cf3c8aB3"; // Contractul tău pentru swap

let polygonUserAddress = null;

function showStatus(msg, isError = false) {
    const el = document.getElementById("statusText");
    if (!el) return;
    el.style.display = "block";
    el.style.color = isError ? "#f87171" : "#38bdf8";
    el.style.background = isError ? "rgba(248, 113, 113, 0.1)" : "rgba(56, 189, 248, 0.1)";
    el.innerText = msg;
}

// Generare Hash Bytes32 unic
function getRandomBytes32() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return "0x" + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 1. Conectare portofel pe Polygon
async function connectPolygonWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask nu este detectat! Deschide pagina din browserul intern MetaMask.");
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        polygonUserAddress = accounts[0];

        // Verificăm rețeaua Polygon (0x89 = 137)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x89') {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }],
                });
            } catch (e) {
                alert("Te rog să schimbi rețeaua în MetaMask pe Polygon Mainnet!");
            }
        }

        document.getElementById("connectBtn").innerText = Conectat: ${polygonUserAddress.substring(0,6)}...;
        document.getElementById("depositSection").style.display = "block";
        document.getElementById("txHash").value = getRandomBytes32();
        showStatus("Portofel Polygon conectat cu succes!");
    } catch (err) {
        showStatus("Eroare la conectare: " + err.message, true);
    }
}

// 2. Fluxul complet: Approve USDT + Deposit în Smart Contract
async function handlePolygonDeposit() {
    const amountVal = document.getElementById("amountPoly").value;
    const txHashVal = document.getElementById("txHash").value;
    const depositBtn = document.getElementById("depositBtn");

    if (!amountVal || amountVal <= 0) {
        alert("Introdu o sumă validă!");
        return;
    }

    try {
        depositBtn.disabled = true;
        const amountWeiBigInt = BigInt(Math.floor(amountVal * 1000000)); // USDT are 6 zecimale pe Polygon
        const amountHex = amountWeiBigInt.toString(16).padStart(64, '0');

        // PASUL 1: Aprobare (Approve) USDT către contractul tău
        showStatus("Pasul 1/2: Aprobă tranzacția de USDT în MetaMask...");
        const spenderPadded = POLYGON_CONTRACT.toLowerCase().replace("0x", "").padStart(64, '0');
        
        const approveTx = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ 
                from: polygonUserAddress, 
                to: POLYGON_USDT, 
                data: "0x095ea7b3" + spenderPadded + amountHex 
            }]
        });

        showStatus("Se așteaptă confirmarea aprobării pe rețeaua Polygon (10 secunde)...");
        await new Promise(r => setTimeout(r, 10000));

        // PASUL 2: Deposit în Smart Contract cu Hash-ul unic
        showStatus("Pasul 2/2: Confirmă depunerea în Smart Contract...");
        const hashClean = txHashVal.replace("0x", "").padStart(64, '0');
        
        // Selectorul funcției deposit(bytes32,uint256)
        const depositData = "0x1de26e16" + hashClean + amountHex; 

        const depositTx = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ 
                from: polygonUserAddress, 
                to: POLYGON_CONTRACT, 
                data: depositData 
            }]
        });

        showStatus("✅ Depunere înregistrată cu succes! Hash: " + depositTx.substring(0,10) + "...");
        document.getElementById("txHash").value = getRandomBytes32(); // Generăm un nou hash pentru următoarea tranzacție
    } catch (err) {
        console.error(err);
        showStatus("❌ Eroare: " + (err.message || err), true);
    } finally {
        depositBtn.disabled = false;
    }
}
