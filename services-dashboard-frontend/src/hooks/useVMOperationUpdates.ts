import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signalRService } from '../services/signalr.service';
import type { VMOperationUpdate } from '../services/signalr.service';
import type { VMOperation, VMOperationStatus } from '../types/VirtualMachine';

interface UseVMOperationUpdatesOptions {
  operationId?: string;
  onUpdate?: (update: VMOperationUpdate) => void;
  onComplete?: (update: VMOperationUpdate) => void;
  onError?: (update: VMOperationUpdate) => void;
}

export function useVMOperationUpdates(options: UseVMOperationUpdatesOptions = {}) {
  const { operationId, onUpdate, onComplete, onError } = options;
  const queryClient = useQueryClient();

  const handleUpdate = useCallback((update: VMOperationUpdate) => {
    // Always invalidate the operations list
    queryClient.invalidateQueries({ queryKey: ['vm-operations'] });

    // If we're tracking a specific operation, update its cache
    if (operationId && update.operationId === operationId) {
      queryClient.setQueryData<VMOperation>(
        ['vm-operation', operationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            status: update.status as VMOperationStatus,
            progressPercent: update.progress,
            currentStage: update.stage,
            ipAddress: update.ipAddress,
            sshConnectionString: update.sshConnectionString,
            errorMessage: update.errorMessage,
          };
        }
      );
    }

    // Call the update callback
    onUpdate?.(update);

    // Handle completion
    if (update.status === 'Ready') {
      onComplete?.(update);
    }

    // Handle errors
    if (update.status === 'Failed' || update.status === 'Cancelled') {
      onError?.(update);
    }
  }, [queryClient, operationId, onUpdate, onComplete, onError]);

  useEffect(() => {
    const unsubscribe = signalRService.onVMOperationUpdate(handleUpdate);
    return () => unsubscribe();
  }, [handleUpdate]);
}

export function useVMOperationsPolling(operationId?: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !operationId) return;

    // Set up polling for the operation status as a fallback
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['vm-operation', operationId] });
    }, 5000);

    return () => clearInterval(interval);
  }, [queryClient, operationId, enabled]);
}
