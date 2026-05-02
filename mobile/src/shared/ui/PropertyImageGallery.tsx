import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import type { PropertyImageOut } from '@src/types/catalog';
import { ImageGalleryModal } from './ImageGalleryModal';

const HERO_HEIGHT = 280;

interface PropertyImageGalleryProps {
  images: PropertyImageOut[];
  propertyName: string;
}

export function PropertyImageGallery({ images, propertyName }: PropertyImageGalleryProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.display_order - b.display_order),
    [images],
  );

  if (sortedImages.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="image-outline" size={60} color={colors.border.default} />
      </View>
    );
  }

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex && idx >= 0 && idx < sortedImages.length) {
      setActiveIndex(idx);
    }
  };

  const currentCaption = sortedImages[activeIndex]?.caption;
  const hasMultiple = sortedImages.length > 1;

  return (
    <>
      <Pressable
        testID="property-image-gallery"
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('property.gallery.openFull')}
        style={styles.wrapper}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <FlatList
            testID="property-image-gallery-list"
            data={sortedImages}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.url }}
                style={{ width, height: HERO_HEIGHT }}
                resizeMode="cover"
                accessibilityLabel={item.caption ?? propertyName}
              />
            )}
          />
        )}

        {hasMultiple && (
          <View style={styles.counterPill} pointerEvents="none">
            <Ionicons name="images-outline" size={13} color={colors.onPrimary} />
            <Text style={styles.counterText}>
              {t('property.gallery.counter', {
                current: activeIndex + 1,
                total: sortedImages.length,
              })}
            </Text>
          </View>
        )}

        {currentCaption ? (
          <View style={styles.captionPill} pointerEvents="none">
            <Text style={styles.captionText} numberOfLines={1}>
              {currentCaption}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <ImageGalleryModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        images={sortedImages}
        initialIndex={activeIndex}
        onIndexChange={setActiveIndex}
        propertyName={propertyName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: HERO_HEIGHT,
    backgroundColor: colors.surface.soft,
    overflow: 'hidden',
  },
  placeholder: {
    height: HERO_HEIGHT,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  counterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
  captionPill: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    maxWidth: '55%',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  captionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
});
