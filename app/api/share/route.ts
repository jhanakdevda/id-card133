import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, text } = await req.json()

    if (!imageBase64 || !text) {
      return NextResponse.json(
        { error: 'Missing imageBase64 or text' },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to catbox.moe (free file hosting, no auth required)
    const formData = new FormData()
    formData.append('fileupload', new Blob([buffer], { type: 'image/png' }))

    const uploadResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image')
    }

    const responseText = await uploadResponse.text()
    
    if (!responseText.startsWith('https://')) {
      throw new Error('Invalid upload response')
    }

    const imageUrl = responseText.trim()

    // Generate Twitter share URL with image as URL preview
    const tweetText = encodeURIComponent(text)
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(imageUrl)}`

    return NextResponse.json({
      success: true,
      twitterUrl: twitterShareUrl,
      imageUrl: imageUrl,
    })
  } catch (error) {
    console.error('[share API] error:', error)
    
    // Fallback: open Twitter with just text if image upload fails
    return NextResponse.json(
      { error: 'Image upload failed, will open Twitter with text only' },
      { status: 500 }
    )
  }
}

