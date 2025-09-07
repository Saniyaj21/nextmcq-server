import Banner from '../models/Banner.js';

export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get banners' });
  }
};

export const createBanner = async (req, res) => {
  try {
    console.log(req.body);
    const { title, imageURL } = req.body;
    const banner = await Banner.create({ title, imageURL });
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
};