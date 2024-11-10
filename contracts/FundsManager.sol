// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract FundsManager is Initializable, UUPSUpgradeable, OwnableUpgradeable{
    uint public depositTotal;
    mapping(address => uint) public balances;
    mapping (address => mapping (address => uint256)) public funding;

    event Log(string func, uint gas);
    event Recieved(uint amount, address who);
    event Withdraw(address debitor, uint _withdrawalAmount, uint balance);
    event FundedPlayer(address whoFunded, address playerFunded, uint fundingAmount);
    
    // Function to receive Ether. msg.data must be empty
    receive() external payable {
        balances[msg.sender] += msg.value;
        depositTotal +=msg.value;
        emit Recieved(msg.value, msg.sender);
    }

    // // Fallback function is called when msg.data is not empty
    fallback() external payable {
        emit Log("fallback", gasleft());
    }
    
    ///@dev no constructor in upgradable contracts. Instead we have initializers
    function initialize() public initializer {
        ///@dev as there is no constructor, we need to initialise the OwnableUpgradeable explicitly
        __Ownable_init();
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    function getMessageHash(
        uint _withdrawalAmount,
        uint _newBalance,
        string memory _message,
        uint _nonce
    ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(msg.sender, _withdrawalAmount, _newBalance, _message, _nonce));
    }

    function _getMessageHash(
        address from,
        uint _withdrawalAmount,
        uint _newBalance,
        string memory _message,
        uint _nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, _withdrawalAmount, _newBalance, _message, _nonce));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
            );
    }

    function verify(address _signer, uint _withdrawalAmount, uint newBalance, string memory _message, uint _nonce, bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = _getMessageHash(_signer, _withdrawalAmount, newBalance, _message, _nonce);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signer;
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function fundPlayer(address payable player) public payable{
        balances[player]+= msg.value;
        funding[msg.sender][player] +=msg.value;
        depositTotal += msg.value;
        emit FundedPlayer(msg.sender, player, msg.value);
    }
    
    function withdraw(address payable debitor, uint _withdrawalAmount, uint newBalance, string memory _message, uint _nonce, bytes memory signature) 
      public payable onlyOwner {
        require(verify(debitor, _withdrawalAmount, newBalance, _message, _nonce, signature), "Invalid Signature");
        _rebalance(debitor, newBalance);
        require(balances[debitor]>=_withdrawalAmount, "Insufficient Balance!");
        require(depositTotal >= _withdrawalAmount, "Insufficient Balance in Smart Contract");
        (bool sent, ) = debitor.call{value: _withdrawalAmount}("sent");
        require(sent, "Failed to complete");
        // balances[debitor]-=_withdrawalAmount;
        depositTotal -= _withdrawalAmount;
        emit Withdraw(debitor, _withdrawalAmount, balances[debitor]);

    }

    function _rebalance(address debitor, uint newBalance) internal {
        balances[debitor] = newBalance;
    }
    
}