import styled from 'styled-components';
import { useImages, useSetting } from '../../settings';
import { useGameValue } from '../GameProvider';
import { motion } from 'framer-motion';
import { JoiImage } from '../../common';
import { useAutoRef, useImagePreloader, useLooping } from '../../utils';
import { ImageItem, ImageSize, ImageType } from '../../types';
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

const StyledImageControls = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
`;

const StyledArrowButton = styled.button`
  pointer-events: auto;
  appearance: none;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin: 16px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 24px;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.55);
    transform: scale(1.08);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }
`;

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
  const [history, setHistory] = useState<ImageItem[]>([]);

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

    if (currentImage) {
      setHistory(prev => [...prev.slice(-19), currentImage]);
    }

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

  const goPrevious = useCallback(() => {
    if (!currentImage || history.length === 0) return;

    const previousImage = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setNextImages(prev => [currentImage, ...prev]);
    setCurrentImage(previousImage);
  }, [currentImage, history, setCurrentImage, setNextImages]);

  useEffect(() => switchImage(), [switchImage]);

  useLooping(switchImage, switchDuration);  

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        /INPUT|TEXTAREA|SELECT/.test(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        switchImage();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrevious, switchImage]);

  return (
    <StyledGameImages>
      {currentImage && (
        <>
          <StyledBackgroundImage
            key={currentImage.id + '-bg'}
            animate={{
              scale: [1.2, 1.4, 1.2],
            }}
            transition={{
              duration: switchDuration / 1000,
              repeat: Infinity,
            }}
          >
            <JoiImage
              key={currentImage.id + '-bg-img'}
              thumb={currentImage.thumbnail}
              preview={currentImage.preview}
              full=''
              kind={currentImage.type === ImageType.video ? 'video' : 'image'}
              objectFit='cover'
            />
          </StyledBackgroundImage>
          <StyledForegroundImage key={currentImage.id + '-fg'}>
            <JoiImage
              key={currentImage.id + '-fg-img'}
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
            />
          </StyledForegroundImage>
          <StyledImageControls>
            <StyledArrowButton
              type='button'
              onClick={goPrevious}
              disabled={history.length === 0}
              aria-label='Previous image'
            >
              ←
            </StyledArrowButton>
            <StyledArrowButton
              type='button'
              onClick={switchImage}
              aria-label='Next image'
            >
              →
            </StyledArrowButton>
          </StyledImageControls>
        </>
      )}
    </StyledGameImages>
  );
};
