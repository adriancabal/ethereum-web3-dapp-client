import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

const  { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);
    
    return transactionContract;

    // console.log({
    //     provider,
    //     signer,
    //     transactionContract
    // });
}

export const TransactionProvider = ({children}) => {
    const [currentAccount, setCurrentAccount ] = useState("");
    const [formData, setFormData] = useState({ addressTo: '', amount: '', keyword: '', message: ''});
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    const [transactions, setTransactions] = useState([]);
    // typing in the inputs on the form changes the state of the form data
    const handleChange = (e, name) => {
        console.log("amountValue: ", e.target.value);
        setFormData((prevState) => ({...prevState, [name]: e.target.value}));
    }

    const getAllTransactions = async () => {
        try {
            if(!ethereum) {
                return alert("install Metamask!");
            };

            const transactionContract = getEthereumContract();
            const availableTransactions = await transactionContract.getAllTransactions();
            
            const structuredTransactions = availableTransactions.map((transaction) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(), 
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)
            }));
            console.log("structuredTransactions: ", structuredTransactions);
            setTransactions(structuredTransactions);

            // console.log("availableTransactions: ", availableTransactions);
        } catch(error) {
            console.log(error);
        }
    }
   
    const checkIfWalletIsConnected = async () => {
        try {
            if(!ethereum) {
                return alert("install Metamask!");
            };
            const accounts = await ethereum.request({method: 'eth_accounts'});
    
            if(accounts.length){
                setCurrentAccount(accounts[0]);
                
                getAllTransactions();
            }else {
                console.log("No accounts found.");
            }
        } catch (error) {
            throw new Error("No ethereum object.");
        }
        
        // console.log(accounts);
    }

    const checkIfTransactionsExist = async () => {
        try {
            if(!ethereum) {
                return alert("install Metamask!");
            };
            const transactionContract = getEthereumContract();
            const transactionCount = await transactionContract.getTransactionCount();

            window.localStorage.setItem("transactionCount", transactionCount);
        } catch(error){
            console.log(error);
            throw new Error("No ethereum object.")
        }
    }

    const connectWallet = async () => {
        console.log("connecting wallet...");
        try {
            if(!ethereum) {
                return alert("install Metamask!");
            };
            console.log("awaiting ethereum request accounts...");
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            console.log("accounts: ", accounts);
            setCurrentAccount(accounts[0]);
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object.")
        }
    }

    const sendTransaction = async () => {
        try {
            if(!ethereum) {
                return alert("install Metamask!");
                // get the data from the form
            };
            console.log("here1");
            const { addressTo, amount, keyword, message } = formData;
            const transactionContract = getEthereumContract();
            console.log("here2");
            const parsedAmount = ethers.utils.parseEther(amount);
            console.log("here3");
            console.log("currentAccount: ", currentAccount);
            console.log("addressTo: ", addressTo);
            console.log("parsedAmount: ", parsedAmount);
            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x5208', // 21000 GWEI
                    value: parsedAmount._hex, // 0.0001
                }]
            });
            console.log("here4");

            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            console.log("transactionHAsh: ", transactionHash);
            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);
            await transactionHash.wait();
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);
            getAllTransactions();
            const transactionCount = await transactionContract.getTransactionCount();
            setTransactionCount(transactionCount.toNumber());
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object.");
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExist();
    }, []);

    return (
        <TransactionContext.Provider value={{ connectWallet, currentAccount, formData, setFormData, handleChange, sendTransaction, transactions, isLoading }}>
            {children}
        </TransactionContext.Provider>
    );
}