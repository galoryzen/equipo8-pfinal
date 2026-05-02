import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, typography, spacing } from '@src/theme';
import { Button } from '@src/shared/ui';
import { getPropertyDetail } from '@src/features/catalog/catalog-service';
import { ReviewCard } from '@src/features/catalog/review-card';
import { RatingHeader } from '@src/features/catalog/rating-header';
import type { Review } from '@src/types/catalog';

const PAGE_SIZE = 10;

export default function PropertyReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [items, setItems] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextPage: number) => {
      const isFirst = nextPage === 1;
      if (isFirst) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const response = await getPropertyDetail(id!, {
          review_page: nextPage,
          review_page_size: PAGE_SIZE,
        });
        const avg = response.detail.rating_avg;
        setRatingAvg(avg != null ? Number(avg) : null);
        setTotal(response.reviews.total);
        setTotalPages(response.reviews.total_pages);
        setPage(response.reviews.page);
        setItems((prev) =>
          isFirst ? response.reviews.items : [...prev, ...response.reviews.items],
        );
      } catch {
        setError('No se pudieron cargar las reseñas.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const canLoadMore = page < totalPages;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t('property.allReviews') }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t('property.allReviews') }} />
        <View style={styles.centerState}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Button title={t('common.retry')} onPress={() => loadPage(1)} />
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerTitle: t('property.allReviews') }} />
      <FlatList
        data={items}
        keyExtractor={(review) => review.id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <RatingHeader ratingAvg={ratingAvg} reviewCount={total} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyReviews}>{t('property.noReviews')}</Text>
        }
        ListFooterComponent={
          canLoadMore ? (
            <Button
              variant="outline"
              title={t('property.loadMore')}
              loading={loadingMore}
              onPress={() => loadPage(page + 1)}
              style={styles.loadMore}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.surface.white,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyReviews: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  loadMore: {
    marginTop: spacing.md,
  },
});
