// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract AuthorizationManager {
    using ECDSA for bytes32;

    // Tracks whether an authorization has already been consumed
    mapping(bytes32 => bool) public consumed;

    // Address allowed to sign authorizations
    address public trustedSigner;

    // Event for observability
    event AuthorizationConsumed(bytes32 indexed authId);

    constructor(address _trustedSigner) {
        trustedSigner = _trustedSigner;
    }

    function verifyAuthorization(
        address vault,
        address recipient,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external returns (bool) {

        // 1. Reconstruct the signed message
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                vault,
                block.chainid,
                recipient,
                amount,
                nonce
            )
        );

        // 2. Authorization identifier
        bytes32 authId = messageHash;

        // 3. Ensure authorization not already used
        require(!consumed[authId], "Authorization already used");

        // 4. Recover signer
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);

        // 5. Validate signer
        require(signer == trustedSigner, "Invalid signer");

        // 6. Mark authorization as consumed (CRITICAL STEP)
        consumed[authId] = true;

        // 7. Emit event
        emit AuthorizationConsumed(authId);

        return true;
    }
}
