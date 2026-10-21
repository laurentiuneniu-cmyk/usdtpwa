const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
const YOUR_CONTRACT_ADDRESS = "0x6F8fa63C85165FcaC7714E3E430Cd3A9cf3c8aB3"; 

const USDT_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)"
];

const YOUR_CONTRACT_ABI = [
    "function deposit(bytes32 _transactionHash, uint256 _amount) public"
];

let provider;
let signer;

function generateBytes32Hash() {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
}

function showStatus(message, isError = false) {
    const statusText = document.getElementById("statusText");
    if (!statusText) return;
    statusText.style.display = "block";
    statusText.style.color = isError ? "#f87171" : "#38bdf8";
    statusText.style.background = isError ? "rgba(248, 113, 113, 0.1)" : "rgba(56, 189, 248, 0.1)";
    statusText.innerText = message;
}

async function connectWallet() {
    try {
        showStatus("Se încearcă conectarea...");
        if (typeof window.ethereum === 'undefined') {
            alert("Nu s-a detectat MetaMask! Deschide linkul din browserul intern MetaMask.");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        
        const userAddress = await signer.getAddress();
        
        document.getElementById("connectBtn").innerText = Conectat: ${userAddress.substring(0,6)}...;
        document.getElementById("depositSection").style.display = "block";
        document.getElementById("txHash").value = generateBytes32Hash();
        
        showStatus("Portofel conectat cu succes!");
    } catch (error) {
        console.error("Eroare detaliată:", error);
        showStatus("Eroare: " + (error.message || error), true);
    }
}

async function handleDeposit() {
    const amountInput = document.getElementById("amount").value;
    const txHashInput = document.getElementById("txHash").value;
    const depositBtn = document.getElementById("depositBtn");

    if (!amountInput || amountInput <= 0) {
        alert("Introdu o sumă validă!");
        return;
    }

    try {
        depositBtn.disabled = true;
        const amountWei = ethers.utils.parseUnits(amountInput, 6);

        showStatus("Pasul 1/2: Aprobare USDT...");
        const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
        const approveTx = await usdtContract.approve(YOUR_CONTRACT_ADDRESS, amountWei);
        await approveTx.wait();

        showStatus("Pasul 2/2: Depunere în contract...");
        const myContract = new ethers.Contract(YOUR_CONTRACT_ADDRESS, YOUR_CONTRACT_ABI, signer);
        const depositTx = await myContract.deposit(txHashInput, amountWei);
        await depositTx.wait();

        showStatus("✅ Depunere reușită!");
        document.getElementById("txHash").value = generateBytes32Hash();
    } catch (error) {
        console.error(error);
        showStatus("❌ Eroare: " + (error.reason || error.message), true);
    } finally {
        depositBtn.disabled = false;
    }
}

// Atașăm evenimentele direct când se încarcă pagina
window.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById("connectBtn");
    const depositBtn = document.getElementById("depositBtn");

    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (depositBtn) depositBtn.addEventListener('click', handleDeposit);
});
