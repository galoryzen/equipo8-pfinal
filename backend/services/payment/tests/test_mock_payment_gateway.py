from app.adapters.outbound.mock.mock_payment_gateway import MockPaymentGateway


def test_mock_gateway_declines_when_fail_substring_in_token():
    gw = MockPaymentGateway()
    out = gw.authorize_payment_instrument("tok_mock_abc_fail_xyz")
    assert out.succeeded is False
    assert out.decline_reason == "mock_declined"


def test_mock_gateway_accepts_normal_token():
    gw = MockPaymentGateway()
    out = gw.authorize_payment_instrument("tok_mock_ok")
    assert out.succeeded is True
    assert out.decline_reason is None
