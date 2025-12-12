"""
Minimal S3-compatible uploader for Cloudflare R2 using only stdlib.

Environment variables (required):
  R2_ENDPOINT             e.g. https://<accountid>.r2.cloudflarestorage.com
  R2_BUCKET               bucket name
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY

Optional:
  R2_PREFIX               key prefix, e.g. miku/images
  R2_PUBLIC_BASE_URL      public base URL for constructed links (e.g. https://cdn.example.com)
"""

from __future__ import annotations

import datetime
import hashlib
import hmac
import mimetypes
import os
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse, quote
from urllib.request import Request, urlopen


@dataclass
class R2Config:
    endpoint: str
    bucket: str
    access_key: str
    secret_key: str
    prefix: str = ""
    public_base_url: Optional[str] = None


class R2Uploader:
    def __init__(self, config: R2Config, date_prefix: Optional[str] = None, debug: bool = False):
        self.config = config
        self.date_prefix = date_prefix
        self.debug = debug
        parsed = urlparse(config.endpoint)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("R2_ENDPOINT must be a valid URL")
        self.host = parsed.netloc
        self.scheme = parsed.scheme

    def _derive_key(self, filename: str) -> str:
        segments = []
        if self.config.prefix.strip("/"):
            segments.append(self.config.prefix.strip("/"))
        if self.date_prefix:
            segments.append(self.date_prefix.strip("/"))
        segments.append(filename)
        return "/".join(segments)

    def _encode_uri_path(self, path: str) -> str:
        """Encode URI path for AWS Signature V4.

        Each path segment should be URL-encoded, but '/' should not be encoded.
        """
        # Split by '/', encode each segment, then rejoin
        segments = path.split('/')
        encoded_segments = [quote(segment, safe='') for segment in segments]
        return '/'.join(encoded_segments)

    def _sign(self, method: str, uri: str, headers: dict, payload_hash: str, amz_date: str, date_stamp: str) -> str:
        # Encode URI for canonical request
        canonical_uri = self._encode_uri_path(uri)

        canonical_headers = "".join(
            f"{k.lower()}:{headers[k].strip()}\n" for k in sorted(headers)
        )
        signed_headers = ";".join(sorted(k.lower() for k in headers))
        canonical_request = "\n".join(
            [
                method,
                canonical_uri,
                "",  # query string
                canonical_headers,
                signed_headers,
                payload_hash,
            ]
        )

        algorithm = "AWS4-HMAC-SHA256"
        credential_scope = f"{date_stamp}/auto/s3/aws4_request"
        string_to_sign = "\n".join(
            [
                algorithm,
                amz_date,
                credential_scope,
                hashlib.sha256(canonical_request.encode()).hexdigest(),
            ]
        )

        signing_key = _get_signature_key(self.config.secret_key, date_stamp, "auto", "s3")
        signature = hmac.new(signing_key, string_to_sign.encode(), hashlib.sha256).hexdigest()

        authorization_header = (
            f"{algorithm} Credential={self.config.access_key}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        if self.debug:
            print("\n[R2 Debug] Signature Details:")
            print(f"  Method: {method}")
            print(f"  URI (raw): {uri}")
            print(f"  URI (canonical): {canonical_uri}")
            print(f"  Signed Headers: {signed_headers}")
            print(f"  Payload Hash: {payload_hash}")
            print(f"  Date: {amz_date}")
            print(f"  Canonical Request Hash: {hashlib.sha256(canonical_request.encode()).hexdigest()}")
            print(f"  Signature: {signature}")
            print(f"  Authorization: {authorization_header[:80]}...")

        return authorization_header

    def upload_file(self, file_path: str, object_name: Optional[str] = None, max_retries: int = 3) -> str:
        if not os.path.isfile(file_path):
            raise FileNotFoundError(file_path)

        print(f"[R2] Preparing upload: {file_path}")
        with open(file_path, "rb") as f:
            data = f.read()

        filename = object_name or os.path.basename(file_path)
        key = self._derive_key(filename)
        uri = f"/{self.config.bucket}/{key}"
        url = f"{self.scheme}://{self.host}{uri}"

        file_size_kb = len(data) / 1024
        print(f"[R2] Uploading {file_size_kb:.1f} KB to: {url}")

        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                payload_hash = hashlib.sha256(data).hexdigest()
                now = datetime.datetime.utcnow()
                amz_date = now.strftime("%Y%m%dT%H%M%SZ")
                date_stamp = now.strftime("%Y%m%d")

                content_type, _ = mimetypes.guess_type(filename)
                content_type = content_type or "application/octet-stream"

                headers = {
                    "Host": self.host,
                    "x-amz-content-sha256": payload_hash,
                    "x-amz-date": amz_date,
                    "Content-Type": content_type,
                }

                auth = self._sign("PUT", uri, headers, payload_hash, amz_date, date_stamp)
                headers["Authorization"] = auth

                if attempt > 1:
                    print(f"[R2] Retry attempt {attempt}/{max_retries}")

                req = Request(url, data=data, method="PUT", headers=headers)
                with urlopen(req, timeout=60) as resp:
                    if resp.status not in (200, 201):
                        body = resp.read().decode('utf-8', errors='ignore')
                        raise RuntimeError(f"Upload failed: {resp.status} {body}")

                print(f"[R2] ✓ Upload success: {key}")

                if self.config.public_base_url:
                    base = self.config.public_base_url.rstrip("/")
                    public_url = f"{base}/{key}"
                    print(f"[R2] Public URL: {public_url}")
                    return public_url

                fallback_url = f"{self.config.endpoint.rstrip('/')}/{self.config.bucket}/{key}"
                print(f"[R2] Public URL (fallback): {fallback_url}")
                return fallback_url

            except Exception as e:
                last_error = e
                error_msg = str(e)
                print(f"[R2] ✗ Upload attempt {attempt} failed: {error_msg}")

                # Print detailed error info for debugging
                if "401" in error_msg or "Unauthorized" in error_msg:
                    print(f"[R2] Authentication failed. Please check:")
                    print(f"[R2]   - R2_ACCESS_KEY_ID is correct")
                    print(f"[R2]   - R2_SECRET_ACCESS_KEY is correct")
                    print(f"[R2]   - Bucket '{self.config.bucket}' exists and is accessible")
                    print(f"[R2]   - Endpoint: {self.config.endpoint}")
                elif "SSL" in error_msg or "EOF" in error_msg:
                    print(f"[R2] Network/SSL error. This might be transient, retrying...")

                if attempt < max_retries:
                    import time
                    wait_time = attempt * 2  # Exponential backoff: 2s, 4s, 6s
                    print(f"[R2] Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    print(f"[R2] All {max_retries} attempts failed")
                    raise RuntimeError(f"Failed to upload after {max_retries} attempts: {last_error}") from last_error


def load_config_from_env() -> Optional[R2Config]:
    endpoint = os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    if not all([endpoint, bucket, access_key, secret_key]):
        return None
    return R2Config(
        endpoint=endpoint,
        bucket=bucket,
        access_key=access_key,
        secret_key=secret_key,
        prefix=os.getenv("R2_PREFIX", ""),
        public_base_url=os.getenv("R2_PUBLIC_BASE_URL") or None,
    )


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signature_key(key: str, date_stamp: str, region_name: str, service_name: str) -> bytes:
    k_date = _sign(("AWS4" + key).encode("utf-8"), date_stamp)
    k_region = _sign(k_date, region_name)
    k_service = _sign(k_region, service_name)
    k_signing = _sign(k_service, "aws4_request")
    return k_signing


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Upload a file to R2")
    parser.add_argument("file", help="local file path")
    parser.add_argument("--key", help="override object name/key")
    args = parser.parse_args()

    cfg = load_config_from_env()
    if not cfg:
        raise SystemExit("Missing R2 env: R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY")

    uploader = R2Uploader(cfg)
    url = uploader.upload_file(args.file, args.key)
    print(url)
