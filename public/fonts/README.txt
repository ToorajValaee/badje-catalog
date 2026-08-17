Dana static font setup
======================

Copy these exact files into this directory before building the Docker image:

  Dana-Light.woff2
  Dana-Regular.woff2
  Dana-Medium.woff2
  Dana-DemiBold.woff2
  Dana-Bold.woff2
  Dana-ExtraBold.woff2
  Dana-Black.woff2

They are mapped to CSS weights 300, 400, 500, 600, 700, 800 and 900.

The current UI does not need Hairline, Thin, UltraLight, Heavy or fat.

After deployment verify:

  https://catalog.badje.ir/fonts/Dana-Regular.woff2

It must return HTTP 200. Linux filenames are case-sensitive.
Use DevTools > Network and filter by "Dana-" to verify the loaded weights.
