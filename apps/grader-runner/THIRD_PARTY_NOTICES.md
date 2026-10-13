# Third-party notices

The trusted grader runner includes `github.com/dop251/goja` at `v0.0.0-20260106131823-651366fbe6e3` and its compiled transitive dependencies. Dependency versions are pinned by `go.mod`/`go.sum` and the production build disables CGO.

## goja

Copyright (c) 2016 Dmitry Panov

Copyright (c) 2012 Robert Krimen

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Before publishing the OCI image to a production registry, deployment packaging must retain the complete license set for all compiled transitive modules. CI treats the module graph as a reviewed supply-chain input; no Go dependency is fetched dynamically by the runtime image.
