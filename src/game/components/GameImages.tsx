import styled from 'styled-components';
import { useImages, useSetting } from '../../settings';
import { useGameValue } from '../GameProvider';
import { motion } from 'framer-motion';
import { JoiImage } from '../../common';
import { useAutoRef, useImagePreloader, useLooping } from '../../utils';
import { ImageSize, ImageType } from '../../types';
import { useCallback, useMemo, useEffect, useState } from 'react';

const StyledGameImages = styled.div`
  position: absolute;
  overflow: hidden;

  height: 100%;
  width: 100%;
`;

const StyledForegroundImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
  user-select: none;
`;

const StyledBackgroundImage = motion.create(styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -2;
  pointer-events: none;
  user-select: none;

  display: flex;
  justify-items: center;
  align-items: center;

  filter: blur(30px);
`);

export const GameImages = () => {
  const [images] = useImages();
  const [currentImage, setCurrentImage] = useGameValue('currentImage');
  const [seenImages, setSeenImages] = useGameValue('seenImages');
  const [nextImages, setNextImages] = useGameValue('nextImages');
  const [intensity] = useGameValue('intensity');
  const [videoSound] = useSetting('videoSound');
  const [highRes] = useSetting('highRes');
  const [imageDuration] = useSetting('imageDuration');
  const [intenseImages] = useSetting('intenseImages');
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);

  useImagePreloader(nextImages, highRes ? ImageSize.full : ImageSize.preview);

  const imagesTracker = useAutoRef({
    images,
    currentImage,
    setCurrentImage,
    seenImages,
    setSeenImages,
    nextImages,
    setNextImages,
  });

  const switchImage = useCallback(() => {
    const {
      images,
      currentImage,
      setCurrentImage,
      seenImages,
      setSeenImages,
      nextImages,
      setNextImages,
    } = imagesTracker.current;

    let next = nextImages;
    if (next.length <= 0) {
      next = images.sort(() => Math.random() - 0.5).slice(0, 3);
    }
    const seen = [...seenImages, ...(currentImage ? [currentImage] : [])];
    if (seen.length > images.length / 2) {
      seen.shift();
    }
    const unseen = images.filter(i => !seen.includes(i));
    setCurrentImage(next.shift());
    setSeenImages(seen);
    setNextImages([...next, unseen[Math.floor(Math.random() * unseen.length)]]);
  }, [imagesTracker]);

  const switchDuration = useMemo(() => {
    if (intenseImages) {
      const scaleFactor = Math.max((100 - intensity) / 100, 0.1);
      return Math.max(imageDuration * scaleFactor * 1000, 1000);
    }
    return imageDuration * 1000;
  }, [imageDuration, intenseImages, intensity]);

  useEffect(() => switchImage(), [switchImage]);

  useEffect(() => {
    setVideoDuration(undefined);
  }, [currentImage?.id]);

  useEffect(() => {
    if (!currentImage) return;

    if (currentImage.type === ImageType.video) {
      if (videoDuration !== undefined) {
        return;
      }
      const timer = window.setTimeout(switchImage, Math.max(switchDuration, 10000));
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(switchImage, switchDuration);
    return () => window.clearTimeout(timer);
  }, [currentImage, switchImage, switchDuration, videoDuration]);

  const onVideoLoadedMetadata = useCallback((event: unknown) => {
    const e = event as CustomEvent<Event>;
    const detail = e?.detail as Event | undefined;
    const target = detail?.target as HTMLVideoElement | null;
    const duration = target?.duration;
    if (typeof duration === 'number' && isFinite(duration)) {
      setVideoDuration(duration);
    }
  }, []);

  const onVideoEnded = useCallback(() => {
    switchImage();
  }, [switchImage]);

  return (
    <StyledGameImages>
      {currentImage && (
        <>
          <StyledBackgroundImage
            animate={{
              scale: [1.2, 1.4, 1.2],
            }}
            transition={{
              duration: switchDuration / 1000,
              repeat: Infinity,
            }}
          >
            <JoiImage
              thumb={currentImage.thumbnail}
              preview={currentImage.preview}
              full=''
              kind={currentImage.type === ImageType.video ? 'video' : 'image'}
              objectFit='cover'
            />
          </StyledBackgroundImage>
          <StyledForegroundImage>
            <JoiImage
              thumb={currentImage.thumbnail}
              preview={currentImage.preview}
              full={currentImage.full}
              // We remove this for now.
              // full={highRes ? currentImage.full : ''}
              kind={currentImage.type === ImageType.video ? 'video' : 'image'}
              playable={currentImage.type === ImageType.video}
              loud={videoSound}
              randomStart={true}
              objectFit='contain'
              onLoadedmetadata={onVideoLoadedMetadata}
              onEnded={onVideoEnded}
            />
          </StyledForegroundImage>
        </>
      )}
    </StyledGameImages>
  );
};
