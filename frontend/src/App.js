import './App.css';

import Web3 from 'web3';
import { contractAbi, contractAddress } from './utils/constants';
import { useEffect, useState } from 'react';

const web3 = new Web3("ws://localhost:8545")
const didContract = new web3.eth.Contract(contractAbi, contractAddress);

// attempted to follow this tutorial 
// https://medium.com/coinmonks/build-a-web-3-application-with-solidity-hardhat-react-and-web3js-61b7ff137885
// generates a DID and prints to the console, but allows to do it only once (revert of second attempt)

// another helpful boilerplate to use...
// https://hardhat.org/tutorial/boilerplate-project
// https://github.com/NomicFoundation/hardhat-boilerplate/tree/master/frontend 

function App() {
	const [identity, createDID] = useState("");
	const [holderAddress, setHolderAddress] = useState("");
	const [mockString, setMockString] = useState("");
	const [issuerInput, setIssuerInput] = useState("");
	const [timestampInput, setTimestampInput] = useState("");
	const [verificationResult, setVerificationResult] = useState("");
	const [logOutput, setLogOutput] = useState("");
	const [executionTime, setExecutionTime] = useState("");

	const registerIdentity = async () => {
		let holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account 1
		let issuer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Account 2
		let now = new Date().getMilliseconds();

		// following is a 512 character hexadecimal string, typical for a fingerprint template
		let biometricMockString = "a24f98a8b2c2ffcf6d7777e73ebe756f7e944316056ef5afbe347a3437d760761c3b6bb70b6a43ae09a7a56b623b67d251d9d8f62ac5df73275e5e140afa4afbc3cdd8517b5abd600ac9421a11b39780cec000b82b23ae1af9f71262baf3fedeac24a7f3b7c7c5e81d2bb46002c4a2cfee775b1c650b4d3b365fbb3ecd9727c3d26188604c03a12ac6f1552d2342f9356b9fbec6cbc9bde85d900e243b92a1445da3401ce42a5db8168a75953ae44c3256b1ef73509fc1d264bbb9fd37fb8af730f8600b576bcbf1f1cfd766d4ee8dcf1bfb46ade5474c053d4f9298105c7740a4906532640c00c3b17987ec129d2ffe6b6fb34aea851eb8e601d956e1af78e0"

		let ubaasDID = web3.utils.sha3(issuer + now + biometricMockString);
		await didContract.methods.register(holder, ubaasDID).send({ from: holder });
		const did = await didContract.methods.getInfo(holder).call();

		const logData = `
			Holder is: ${holder}
			Issuer is: ${issuer}
			Date is: ${now}
			Biometric template Mock is: ${biometricMockString}
			DID is: ${did[0]}
		`;
		setLogOutput(logData);

		return did[0];
	};

	const verifyDID = async () => {
		try {

			const startTime = performance.now();

			const chainDIDContract = await didContract.methods.getInfo(holderAddress).call();
			const chainDID = chainDIDContract[0];
			const recomputedDID = web3.utils.sha3(issuerInput + timestampInput + mockString);

			console.log("issuerId: ", issuerInput + " timestamp: ", timestampInput + " biometric: ", mockString + " recomputedDID: ", recomputedDID);
			console.log("chainDID: ", chainDID);
			console.log("verification: ", recomputedDID === chainDID);

			// Comparison
			if (recomputedDID === chainDID) {
				setVerificationResult("Verification successful. Template and DID match.");
			} else {
				setVerificationResult("Verification failed. Invalid inputs.");
			}

			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			setExecutionTime(duration);

		} catch (error) {
			console.error("Verification error: ", error);
			setVerificationResult("Verification failed. Check log.");
		}
	};

	return (
		<div className='App'>

			<h2>User</h2>
			<button className='read' onClick={registerIdentity}>
				Generate DID
			</button>
			<div style={{marginTop: '20px', width: '80%', margin: '0 auto'}}>
				<h3>Log Output:</h3>
				<textarea
					readOnly
					value={logOutput}
					style={{width: '100%', height: '200px', resize: 'vertical'}}
				/>
			</div>

			<h2>Verifier</h2>
			<div>
				<label>
					Holder Address:
					<input
						type="text"
						value={holderAddress}
						onChange={(e) => setHolderAddress(e.target.value)}
						placeholder="Enter holder address"
					/>
				</label>
				<br/>
				<label>
					Issuer Address:
					<input
						type="text"
						value={issuerInput}
						onChange={(e) => setIssuerInput(e.target.value)}
						placeholder="Enter issuer address"
					/>
				</label>
				<br/>
				<label>
					Timestamp:
					<input
						type="text"
						value={timestampInput}
						onChange={(e) => setTimestampInput(e.target.value)}
						placeholder="Enter timestamp"
					/>
				</label>
				<br/>
				<label>
					Biometric Template:
				</label>

				<input
						type="text"
						value={mockString}
						onChange={(e) => setMockString(e.target.value)}
						placeholder="Enter Biometric Template"
					/>
				<br/>
				<button onClick={verifyDID}>Verify DID</button>
			</div>

			{verificationResult && <p>{verificationResult}</p>}

			{executionTime && <p>Execution time: {executionTime} ms</p>}

		</div>
	);
}

export default App;
