pragma circom 2.1.9;

include "./circomFiles/poseidon.circom";
include "./circomFiles/comparators.circom";

template DIDValidation() {

    signal input biometricTemplate;
    signal input issuer;
    signal input now;
    signal input DID;

    signal output isValid;

    component hash = Poseidon(3);
    hash.inputs[0] <== biometricTemplate;
    hash.inputs[1] <== issuer;
    hash.inputs[2] <== now;

    // hash(biometricTemplate, issuer, now) == DID

    component eq = IsEqual();
    eq.in[0] <== hash.out;
    eq.in[1] <== DID;

    isValid <== eq.out;
}

component main {public [issuer, now, DID]} = DIDValidation();
