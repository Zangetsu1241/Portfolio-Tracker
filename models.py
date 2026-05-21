from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    # The API key can be stored here per user so they don't have to re-enter it everywhere
    finnhub_api_key = db.Column(db.String(100), nullable=True)

class Holding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ticker = db.Column(db.String(20), nullable=False)
    shares = db.Column(db.Float, nullable=False)
    buy_price = db.Column(db.Float, nullable=False)

    user = db.relationship('User', backref=db.backref('holdings', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'ticker': self.ticker,
            'shares': self.shares,
            'buyPrice': self.buy_price
        }
