import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  StatusBar,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radius } from '@src/theme';
import type { PropertyImageOut } from '@src/types/catalog';

interface ImageGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  images: PropertyImageOut[];
  initialIndex: number;
  propertyName: string;
  onIndexChange?: (index: number) => void;
}

export function ImageGalleryModal({
  visible,
  onClose,
  images,
  initialIndex,
  propertyName,
  onIndexChange,
}: ImageGalleryModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleShow = () => {
    setCurrentIndex(initialIndex);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== currentIndex && idx >= 0 && idx < images.length) {
      setCurrentIndex(idx);
      onIndexChange?.(idx);
    }
  };

  const currentCaption = images[currentIndex]?.caption;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      onShow={handleShow}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View
        testID="image-gallery-modal"
        style={styles.container}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          setHeight(e.nativeEvent.layout.height);
        }}
      >
        {width > 0 && height > 0 && (
          <FlatList
            testID="image-gallery-modal-list"
            data={images}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ item }) => (
              <View style={{ width, height, justifyContent: 'center' }}>
                <Image
                  source={{ uri: item.url }}
                  style={{ width, height }}
                  resizeMode="contain"
                  accessibilityLabel={item.caption ?? propertyName}
                />
              </View>
            )}
          />
        )}

        <View
          style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
          pointerEvents="box-none"
        >
          <View style={styles.counterPill} pointerEvents="none">
            <Text style={styles.counterText}>
              {t('property.gallery.counter', {
                current: currentIndex + 1,
                total: images.length,
              })}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('property.gallery.close')}
            style={styles.closeButton}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {currentCaption ? (
          <View
            style={[styles.captionBar, { paddingBottom: insets.bottom + spacing.md }]}
            pointerEvents="none"
          >
            <Text style={styles.captionText}>{currentCaption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  counterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  captionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: '#fff',
    textAlign: 'center',
  },
});
