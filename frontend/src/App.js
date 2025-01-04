import './App.css';

import Web3 from 'web3';
import { contractAbi, contractAddress } from './utils/constants';
import {  useState, useEffect } from 'react';
import * as snarkjs  from "snarkjs";
import { poseidon3 } from 'poseidon-lite'

// needed for esLint:
/* global BigInt */

const web3 = new Web3("ws://localhost:8545")
const didContract = new web3.eth.Contract(contractAbi, contractAddress);

// attempted to follow this tutorial 
// https://medium.com/coinmonks/build-a-web-3-application-with-solidity-hardhat-react-and-web3js-61b7ff137885
// generates a DID and prints to the console, but allows to do it only once (revert of second attempt)

// another helpful boilerplate to use...
// https://hardhat.org/tutorial/boilerplate-project
// https://github.com/NomicFoundation/hardhat-boilerplate/tree/master/frontend 

function App() {

	/**
	 *
	 *    Prefetch files
	 *
	 * */

	const [cachedWasm, setCachedWasm] = useState(null);
	const [cachedZkey, setCachedZkey] = useState(null);

	useEffect(() => {
		async function prefetchFiles() {
			try {
				const circuitWasmBuffer = await fetch("/zkFiles/circuit.wasm").then(res => res.arrayBuffer());
				const circuitWasm = new Uint8Array(circuitWasmBuffer);
				setCachedWasm(circuitWasm);

				const circuitFinalZkeyBuffer = await fetch("/zkFiles/circuit_final.zkey").then(res => res.arrayBuffer());
				const circuitFinalZkey = new Uint8Array(circuitFinalZkeyBuffer);
				setCachedZkey(circuitFinalZkey);

				console.log("files preloaded");
			} catch (error) {
				console.error("failed prefetching files:", error);
			}
		}

		prefetchFiles();
	}, []);

	/**
	 *
	 *    User side - registerIdentity
	 *
	 * */

	const [didOutput, setDidOutput] = useState("");

	const registerIdentity = async () => {
		let holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account 1
		let issuer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Account 2
		let issuerToDecimalString = BigInt(issuer.toLowerCase()).toString(10);
		let nowDecimalString = new Date().getMilliseconds().toString();
		// following is a 512 character hexadecimal string, typical for a fingerprint template
		let biometricMockString = "a24f98a8b2c2ffcf6d7777e73ebe756f7e944316056ef5afbe347a3437d760761c3b6bb70b6a43ae09a7a56b623b67d251d9d8f62ac5df73275e5e140afa4afbc3cdd8517b5abd600ac9421a11b39780cec000b82b23ae1af9f71262baf3fedeac24a7f3b7c7c5e81d2bb46002c4a2cfee775b1c650b4d3b365fbb3ecd9727c3d26188604c03a12ac6f1552d2342f9356b9fbec6cbc9bde85d900e243b92a1445da3401ce42a5db8168a75953ae44c3256b1ef73509fc1d264bbb9fd37fb8af730f8600b576bcbf1f1cfd766d4ee8dcf1bfb46ade5474c053d4f9298105c7740a4906532640c00c3b17987ec129d2ffe6b6fb34aea851eb8e601d956e1af78e0"
		let biometricDecimalString = BigInt("0x" + biometricMockString).toString(10);

		const ubaasDID = poseidon3([biometricDecimalString, issuerToDecimalString, nowDecimalString], 1).toString();

		await didContract.methods.register(holder, ubaasDID).send({from: holder});
		const did = await didContract.methods.getInfo(holder).call();

		const didData = `Holder is: ${holder}\n\nIssuer is: ${issuer}\n\nDate is: ${nowDecimalString}\n\nBiometric template Mock is: ${biometricMockString}\n\nDID is: ${did[0]}`;
		setDidOutput(didData);

		return did[0];
	};

	/**
	 *
	 *    User side - generate a proof
	 *
	 * */

		// generation input
	const [generateHolderAddress, setGenerateHolderAddress] = useState("");
	const [generateBiometricInput, setGenerateBiometricInput] = useState("");
	const [generateIssuer, setGenerateIssuer] = useState("");
	const [generateTimestamp, setGenerateTimestamp] = useState("");

	// generation output
	const [generationTime, setGenerationTime] = useState("");
	const [generatedProof, setGeneratedProof] = useState("");

	const generateProof = async () => {

		try {
			const startTime = performance.now();

			const chainDIDContract = await didContract.methods.getInfo(generateHolderAddress).call();
			const chainDID = chainDIDContract[0];
			const circuitInput = {
				biometricTemplate: BigInt("0x" + generateBiometricInput).toString(10),
				issuer: BigInt(generateIssuer.toLowerCase()).toString(10),
				now: generateTimestamp,
				DID: chainDID
			};

			const {proof, publicSignals} = await snarkjs.groth16.fullProve(
				circuitInput,
				cachedWasm,
				cachedZkey
			);

			const proofData = {proof, publicSignals};
			setGeneratedProof(JSON.stringify(proofData));

			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			setGenerationTime(duration);

		} catch (err) {
			console.log("Error generating proof: ", err);
		}

	};

	/**
	 *
	 *    Verifier side - verifyDID
	 *
	 * */

		// verification input
	const [proofInput, setProofInput] = useState("");
	const [verifierHolderAddress, setVerifierHolderAddress] = useState("");

	// verification output
	const [verificationResult, setVerificationResult] = useState("");
	const [executionTime, setExecutionTime] = useState("");

	const verifyDID = async () => {
		try {

			const startTime = performance.now();

			const verificationKey = await fetch("/zkFiles/verification_key.json").then((res) => res.json());

			const parsedProof = JSON.parse(proofInput);
			const {proof, publicSignals} = parsedProof;

			// compose data to recompose Public Signals
			const chainDIDContract = await didContract.methods.getInfo(verifierHolderAddress).call();
			const chainDID = chainDIDContract[0];

			let issuer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
			let issuerToDecimalString = BigInt(issuer.toLowerCase()).toString(10);

			const recomposedPublicSignals =
				[
					publicSignals[0],
					issuerToDecimalString,
					publicSignals[2],
					chainDID
				];

			if (JSON.stringify(recomposedPublicSignals) !== JSON.stringify(publicSignals)) {
				throw new Error("publicInputs mismatch! Proof invalid!");
			}
			
			const isValid = await snarkjs.groth16.verify(verificationKey, recomposedPublicSignals, proof);

			if (isValid) {
				setVerificationResult("Proof is valid.");
			} else {
				setVerificationResult("Invalid proof.");
			}

			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			setExecutionTime(duration);

		} catch (error) {
			console.error("Verification error: ", error);
			setVerificationResult("Verification failed. Check log.");
		}
	};

	/**
	 *
	 *    Verifier side end
	 *
	 * */

	return (
		<div className='page-container'>

			<div className='main-content'>

				{/* USER SIDE */}
				<div className='card'>
					<h2>User</h2>
					<button className='read' onClick={registerIdentity}>
						Generate DID
					</button>
					<div>
						<textarea
							readOnly
							value={didOutput}
							className={'textarea'}
						/>
					</div>

					<h3>Proof Generation</h3>

					<div className="form-row">
						<label>Holder Address:</label>
						<input
							type="text"
							value={generateHolderAddress}
							onChange={(e) => setGenerateHolderAddress(e.target.value)}
							placeholder="Enter Holder Address input"
						/>
					</div>

					<div className="form-row">
						<label>Issuer:</label>
						<input
							type="text"
							value={generateIssuer}
							onChange={(e) => setGenerateIssuer(e.target.value)}
							placeholder="Enter Issuer input"
						/>
					</div>

					<div className="form-row">
						<label>Timestamp:</label>
						<input
							type="text"
							value={generateTimestamp}
							onChange={(e) => setGenerateTimestamp(e.target.value)}
							placeholder="Enter Timestamp input"
						/>
					</div>

					<div className="form-row">
						<label>Biometric Input:</label>
						<input
							type="text"
							value={generateBiometricInput}
							onChange={(e) => setGenerateBiometricInput(e.target.value)}
							placeholder="Enter biometric mock input"
						/>
					</div>

					<button onClick={generateProof}>Generate Proof</button>
					<br/>
					<label>
						<br/> Generated Proof + Public Signals: <br/>
						<textarea
							readOnly
							value={generatedProof}
							className={'textarea'}
						/>
						{generationTime && <p>Generation time: {generationTime} ms</p>}

					</label>
				</div>

				{/* VERIFIER SIDE */}
				<div className='card'>
					<h2>Verifier</h2>
					<div>

						<div className="form-row">
							<label>Holder Address:</label>
							<input
								type="text"
								value={verifierHolderAddress}
								onChange={(e) => setVerifierHolderAddress(e.target.value)}
								placeholder="Enter Holder Address input"
							/>
						</div>

						<label>
							Paste Proof Input including Public Signals: <br/>
							<textarea
								value={proofInput}
								onChange={(e) => setProofInput(e.target.value)}
								className={'textarea'}
							/>
						</label>
						<br/>
						<button onClick={verifyDID}>Verify Proof</button>
					</div>

					<p>Verification result: {verificationResult} <br/> Execution time: {executionTime} ms</p>
				</div>

			</div>
		</div>
	);
}

export default App;
