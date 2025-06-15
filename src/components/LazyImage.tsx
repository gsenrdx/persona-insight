import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string; // 로딩 중 보여줄 저화질 이미지 또는 스켈레톤 UI
  // width와 height는 실제 이미지 비율에 맞게 설정하거나, CSS로 제어하는 것이 좋음
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, placeholderSrc, ...rest }) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); // 투명 GIF 또는 플레이스홀더
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver;
    const currentImageRef = imageRef.current;

    if (currentImageRef) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(currentImageRef); // 한 번 로드되면 더 이상 관찰할 필요 없음
            }
          });
        },
        {
          // rootMargin: '0px 0px 50px 0px', // 뷰포트 아래 50px 영역에 들어오면 로드 시작
          threshold: 0.1 // 10% 이상 보이면 로드
        }
      );
      observer.observe(currentImageRef);
    }

    return () => {
      if (observer && currentImageRef) {
        observer.unobserve(currentImageRef);
      }
    };
  }, [src]); // src가 변경되면 다시 관찰 설정

  return <img ref={imageRef} src={imageSrc} alt={alt} {...rest} />;
};

export default LazyImage;

// 이미지 사용 예시를 보여줄 부모 컴포넌트
const ImageGalleryComponent = () => {
  const images = [
    {
      id: 1,
      thumb: 'https://via.placeholder.com/150/92c952', // 작은 이미지 (srcset용)
      full: 'https://via.placeholder.com/600/92c952',  // 큰 이미지 (srcset용)
      alt: 'Green Placeholder Image',
      description: 'This is a placeholder image with a green background.'
    },
    {
      id: 2,
      thumb: 'https://via.placeholder.com/150/771796',
      full: 'https://via.placeholder.com/600/771796',
      alt: 'Purple Placeholder Image',
      description: 'A purple background placeholder image.'
    },
    {
      id: 3,
      // 매우 긴 페이지 스크롤 유도용 더미 데이터
      full: 'https://via.placeholder.com/600/24f355',
      alt: 'Teal Placeholder',
      description: 'A teal placeholder.'
    },
    {
      full: 'https://via.placeholder.com/600/f66b97',
      alt: 'Pink Placeholder',
      description: 'A pink placeholder.'
    },
    {
      full: 'https://via.placeholder.com/600/56a8c2',
      alt: 'Blue Placeholder',
      description: 'A blue placeholder.'
    },
    {
      full: 'https://via.placeholder.com/600/b0f7cc',
      alt: 'Light Green Placeholder',
      description: 'A light green placeholder.'
    }
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>Image Gallery (Lazy Loading & Srcset Example)</h2>
      {images.map((img, index) => (
        <div key={img.id || index} style={{ marginBottom: '20px', border: '1px solid #eee', padding: '10px' }}>
          <h3>{img.alt}</h3>
          {/* 예시 1: LazyImage 컴포넌트 사용 */}
          <LazyImage
            src={img.full}
            alt={img.alt}
            placeholderSrc={img.thumb || 'https://via.placeholder.com/50/eee'} // 저화질 이미지나 스켈레톤
            style={{ width: '100%', height: 'auto', maxWidth: '600px', display: 'block', marginBottom: '10px', backgroundColor: '#f0f0f0' }}
          />

          {/* 예시 2: 일반 img 태그에 srcset 사용 (LazyImage와 별개로 보여주기 위함) */}
          {img.thumb && (
            <div>
              <h4>Srcset Example (not lazy loaded here for clarity):</h4>
              <img
                src={img.thumb} // 기본 이미지
                srcSet={`${img.thumb} 300w, ${img.full} 768w`} // 300px 너비용, 768px 너비용
                sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw" // 뷰포트 조건에 따른 이미지 크기
                alt={`${img.alt} (srcset example)`}
                style={{ width: '100%', height: 'auto', maxWidth: '600px', display: 'block', backgroundColor: '#e0e0e0' }}
                loading="lazy" // 브라우저 네이티브 지연 로딩 (지원 브라우저에서만 동작)
              />
            </div>
          )}
          <p>{img.description}</p>
        </div>
      ))}
      <div style={{height: "1000px"}}> {/* 스크롤을 위한 더미 공간 */}
        Scroll down to see more images load.
      </div>
    </div>
  );
};

export default ImageGalleryComponent; // 실제 사용은 ImageGalleryComponent를 통해 확인
// export { LazyImage }; // LazyImage만 개별적으로 사용하려면 이렇게 export할 수도 있음
