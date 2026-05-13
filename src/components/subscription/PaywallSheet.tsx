import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { PremiumBadge } from './PremiumBadge';
import { purchaseProduct, restorePurchases } from '@/services/subscription/subscriptionService';
import { logPurchase, logPaywallView } from '@/services/analytics/analyticsService';
import { useSubscriptionStore } from '@/stores/subscription/useSubscriptionStore';
import type { PremiumFeature } from '@/types/subscription';

interface Props {
  visible: boolean;
  feature: PremiumFeature;
  onClose: () => void;
  onUpgraded?: () => void;
}

const FEATURE_COPY: Record<PremiumFeature, { headline: string; icon: string }> = {
  'ai-meals':            { headline: 'AI-powered meal plans', icon: 'food-variant' },
  'hormone-coaching':    { headline: 'Hormone-aware coaching', icon: 'head-heart-outline' },
  'unlimited-groups':    { headline: 'Unlimited challenge groups', icon: 'account-group' },
  'advanced-hydration':  { headline: 'Advanced hydration tracking', icon: 'water' },
};

const PRO_PERKS = [
  { icon: 'food-variant',        text: 'AI meal suggestions tailored to your cycle phase' },
  { icon: 'head-heart-outline',  text: 'Hormone-aware daily coaching tips' },
  { icon: 'account-group',       text: 'Unlimited accountability groups' },
  { icon: 'water',               text: 'Advanced hydration goal tracking' },
  { icon: 'chart-line',          text: 'Full fasting history & analytics' },
];

const MONTHLY_PRODUCT = 'habitloop_pro_monthly';
const ANNUAL_PRODUCT  = 'habitloop_pro_annual';

export function PaywallSheet({ visible, feature, onClose, onUpgraded }: Props) {
  const insets = useSafeAreaInsets();
  const setSubscriptionState = useSubscriptionStore(s => s.setSubscriptionState);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const featureCopy = FEATURE_COPY[feature];

  React.useEffect(() => {
    if (visible) logPaywallView(feature);
  }, [visible, feature]);

  async function handlePurchase() {
    setBuying(true);
    try {
      const productId = selectedPeriod === 'annual' ? ANNUAL_PRODUCT : MONTHLY_PRODUCT;
      const state = await purchaseProduct(productId);
      setSubscriptionState(state);
      if (state.tier === 'pro') {
        await logPurchase({
          productId,
          billingPeriod: selectedPeriod,
          priceUSD: selectedPeriod === 'annual' ? 59.99 : 7.99,
        });
        onUpgraded?.();
        onClose();
      }
    } catch {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const state = await restorePurchases();
      setSubscriptionState(state);
      if (state.tier === 'pro') {
        onUpgraded?.();
        onClose();
      } else {
        Alert.alert('No Active Subscription', "We couldn't find an active subscription to restore.");
      }
    } catch {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + AppSpacing.lg }]}>
          {/* Handle + close */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={AppColors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Hero */}
            <View style={styles.hero}>
              <PremiumBadge size="md" />
              <Text style={styles.heroHeadline}>Unlock {featureCopy.headline}</Text>
              <Text style={styles.heroSub}>
                Go Pro to access every HabitLoop premium feature — one subscription covers it all.
              </Text>
            </View>

            {/* Perks */}
            <View style={styles.perks}>
              {PRO_PERKS.map((perk) => (
                <View key={perk.text} style={styles.perkRow}>
                  <View style={styles.perkIcon}>
                    <MaterialCommunityIcons
                      name={perk.icon as never}
                      size={18}
                      color={AppColors.primary}
                    />
                  </View>
                  <Text style={styles.perkText}>{perk.text}</Text>
                </View>
              ))}
            </View>

            {/* Plan picker */}
            <View style={styles.planPicker}>
              <TouchableOpacity
                style={[styles.planOption, selectedPeriod === 'annual' && styles.planSelected]}
                onPress={() => setSelectedPeriod('annual')}
                activeOpacity={0.75}
              >
                <View style={styles.planInfo}>
                  <Text style={[styles.planTitle, selectedPeriod === 'annual' && styles.planTitleSelected]}>
                    Annual
                  </Text>
                  <Text style={styles.planPrice}>$4.99/mo</Text>
                </View>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save 37%</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planOption, selectedPeriod === 'monthly' && styles.planSelected]}
                onPress={() => setSelectedPeriod('monthly')}
                activeOpacity={0.75}
              >
                <View style={styles.planInfo}>
                  <Text style={[styles.planTitle, selectedPeriod === 'monthly' && styles.planTitleSelected]}>
                    Monthly
                  </Text>
                  <Text style={styles.planPrice}>$7.99/mo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.ctaBtn, buying && styles.ctaBtnDisabled]}
              onPress={handlePurchase}
              disabled={buying || restoring}
              activeOpacity={0.85}
            >
              {buying
                ? <ActivityIndicator color={AppColors.surface} />
                : <Text style={styles.ctaLabel}>Start Free Trial</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={buying || restoring} activeOpacity={0.7}>
              {restoring
                ? <ActivityIndicator size="small" color={AppColors.gray} />
                : <Text style={styles.restoreText}>Restore Purchase</Text>
              }
            </TouchableOpacity>

            <Text style={styles.legalText}>
              Cancel any time. Billed via the App Store or Google Play. Prices shown in USD.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: AppRadius.lg,
    borderTopRightRadius: AppRadius.lg,
    maxHeight: '92%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
    position: 'relative',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: AppSpacing.lg,
    top: AppSpacing.sm,
    padding: AppSpacing.xs,
  },
  scrollContent: {
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.xl,
    paddingBottom: AppSpacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingTop: AppSpacing.md,
  },
  heroHeadline: {
    fontSize: AppFontSize.xxl,
    fontWeight: '800',
    color: AppColors.dark,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  perks: {
    gap: AppSpacing.md,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  perkText: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
    flex: 1,
    lineHeight: 20,
  },
  planPicker: {
    gap: AppSpacing.sm,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 2,
    borderColor: AppColors.border,
    padding: AppSpacing.md,
  },
  planSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  planInfo: {
    gap: 2,
  },
  planTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.dark,
  },
  planTitleSelected: {
    color: AppColors.primary,
  },
  planPrice: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  savingsBadge: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
  },
  savingsText: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
    color: AppColors.surface,
  },
  footer: {
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.md,
    gap: AppSpacing.md,
    alignItems: 'center',
  },
  ctaBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.full,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaLabel: {
    fontSize: AppFontSize.lg,
    fontWeight: '800',
    color: AppColors.surface,
    letterSpacing: 0.3,
  },
  restoreText: {
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    fontWeight: '600',
  },
  legalText: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
