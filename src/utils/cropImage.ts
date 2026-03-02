export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  renderedWidth?: number,
  renderedHeight?: number,
  rotation = 0
): Promise<string | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Calculate scaling factor between rendered image and natural image
  const scaleX = renderedWidth ? image.naturalWidth / renderedWidth : 1;
  const scaleY = renderedHeight ? image.naturalHeight / renderedHeight : 1;

  // Scale the crop coordinates to match the natural image size
  const naturalCrop = {
    x: pixelCrop.x * scaleX,
    y: pixelCrop.y * scaleY,
    width: pixelCrop.width * scaleX,
    height: pixelCrop.height * scaleY,
  };

  // set canvas size to match the natural crop size
  canvas.width = naturalCrop.width
  canvas.height = naturalCrop.height

  // draw the cropped image onto the canvas using natural coordinates
  ctx.drawImage(
    image,
    naturalCrop.x,
    naturalCrop.y,
    naturalCrop.width,
    naturalCrop.height,
    0,
    0,
    naturalCrop.width,
    naturalCrop.height
  )

  // return as base64
  return canvas.toDataURL('image/jpeg', 0.9)
}
