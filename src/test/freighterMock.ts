export const getAddress = async () => ({ address: 'GB5WJUX2HVSQQL4W767U74TNDVDRMX44H376QLBZZF7NGRG73XF7CEX4' });
export const getNetwork = async () => 'TESTNET';
export const isConnected = async () => true;
export const requestAccess = async () => ['GB5WJUX2HVSQQL4W767U74TNDVDRMX44H376QLBZZF7NGRG73XF7CEX4'];
export const signTransaction = async () => 'xdr_signature';
export const signMessage = async () => 'message_signature';
export const signAuthEntry = async () => 'auth_signature';

export default {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
  signMessage,
  signAuthEntry,
};
