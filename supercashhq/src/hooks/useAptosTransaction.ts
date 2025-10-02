import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

interface TransactionPayload {
    function: string;
    typeArguments?: any[];
    functionArguments: any[];
}

export const useAptosTransaction = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const executeTransaction = async (
    payload: TransactionPayload,
    options: { successMessage: string; errorMessage: string }
  ) => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return { success: false, error: "Wallet not connected" };
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processing transaction...");

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: payload,
      });
      // Optional: Wait for the transaction to be confirmed
      // await aptos.waitForTransaction({ transactionHash: response.hash });
      toast.success(options.successMessage, { id: toastId });
      return { success: true, response };
    } catch (error) {
      console.error("Transaction error:", error);
      // Optionally, inspect error.response or error.message for extra details
      if (error instanceof Error) {
        toast.error(`${options.errorMessage}: ${error.message}`, { id: toastId });
      } else {
        toast.error(options.errorMessage, { id: toastId });
      }
      return { success: false, error };
      // toast.error(options.errorMessage, { id: toastId });
      // return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { executeTransaction, isSubmitting, account };
};