from blockbee import BlockBeeHelper
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI()

API_KEY = "AinNjWaw0V5CGZPf3XxFPtWxcHWfDCr7W82rfNQMeLdw"


class CreatePaymentRequest(BaseModel):
    coin: str
    own_address: str
    callback_url: str
    parameters: dict = {}


class GenerateQRCodeRequest(BaseModel):
    coin: str
    own_address: str
    callback_url: str
    value: float = 0.0
    size: int = 512


class PaymentCallback(BaseModel):
    address: str
    amount: float
    currency: str
    status: str


@app.post("/create-payment")
def create_payment(request: CreatePaymentRequest):
    try:
        bb = BlockBeeHelper(
            coin=request.coin,
            own_address=request.own_address,
            callback_url=request.callback_url,
            parameters=request.parameters,
            bb_params={},
            api_key=API_KEY,
        )
        payment_address = bb.get_address()
        return {
            "status": "success",
            "address": payment_address["address_in"],
            "coin": request.coin,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-qrcode")
def generate_qrcode(request: GenerateQRCodeRequest):
    try:
        bb = BlockBeeHelper(
            coin=request.coin,
            own_address=request.own_address,
            callback_url=request.callback_url,
            parameters={},
            bb_params={},
            api_key=API_KEY,
        )
        qr_data = bb.get_qrcode(value=request.value, size=request.size)
        return {
            "status": "success",
            "qr_code": qr_data["qr_code"],
            "payment_uri": qr_data["payment_uri"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/payment-callback")
def payment_callback(request: PaymentCallback):
    if request.status == "confirmed":
        print(f"Payment is confirmed: {request.amount} {request.currency} on address {request.address}")
    else:
        print(f"Payment status: {request.status}")

    return {"status": "success", "message": "Callback done successfully"}
