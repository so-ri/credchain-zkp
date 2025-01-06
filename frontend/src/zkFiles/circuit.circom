pragma circom 2.1.9;

include "./circomFiles/poseidon.circom";
include "./circomFiles/comparators.circom";

template DIDValidation() {

    signal input biometricTemplate;
    signal input issuer;
    signal input now;
    signal input DID;

    component hash = Poseidon(3);
    hash.inputs[0] <== biometricTemplate;
    hash.inputs[1] <== issuer;
    hash.inputs[2] <== now;

    // hash(biometricTemplate, issuer, now) == DID

    component eq = IsEqual();
    eq.in[0] <== hash.out;
    eq.in[1] <== DID;

    // eq.out must be 1 (hash == DID)
    eq.out === 1;
}

component main {public [issuer, now, DID]} = DIDValidation();
