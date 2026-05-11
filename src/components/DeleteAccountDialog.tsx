import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

import { performAccountDeletion } from '@/services/auth/deleteAccountFlow';
import { AppColors, AppSpacing, AppFontSize } from '@/constants/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function DeleteAccountDialog({ visible, onDismiss }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await performAccountDeletion();
    } catch {
      setError('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  }

  function handleDismiss() {
    if (isDeleting) return;
    setError(null);
    onDismiss();
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} dismissable={!isDeleting}>
        <Dialog.Title style={styles.title}>Delete Account</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.body}>
            This will permanently delete your account and all associated data including fasting
            history, hydration logs, and streaks. This action cannot be undone.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              disabled={isDeleting}
              textColor={AppColors.gray}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
              buttonColor={AppColors.danger}
              textColor="#FFFFFF"
              style={styles.deleteButton}
            >
              {isDeleting ? 'Deleting…' : 'Delete Account'}
            </Button>
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: AppColors.danger,
    fontSize: AppFontSize.xl,
    fontWeight: '700',
  },
  body: {
    color: AppColors.text,
    fontSize: AppFontSize.md,
    lineHeight: 22,
  },
  error: {
    color: AppColors.danger,
    fontSize: AppFontSize.sm,
    marginTop: AppSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    paddingBottom: AppSpacing.sm,
  },
  cancelButton: {
    borderColor: AppColors.border,
  },
  deleteButton: {
    flex: 1,
  },
});
